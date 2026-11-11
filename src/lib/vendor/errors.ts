import type { ErrorEvent, Exception, StackFrame } from '@sentry/nextjs';
import { OTHER_ROUTE, routeTemplate } from '@/lib/analytics/route';
import { scrubUrl } from '@/lib/analytics/scrub';
import {
  ERRORS_ENVIRONMENT,
  ERRORS_RELEASE,
  SENTRY_DSN,
  SENTRY_TUNNEL_PATH,
} from '@/lib/config/errors';
import { maskContactDetails } from '@/lib/utils/contactDetails';

/**
 * Error tracking enters the app here and nowhere else (vendorSeams; next.config
 * and app/api/monitoring are the only other places that name Sentry). The trial
 * (owner, 11 Nov) runs Sentry beside PostHog's own exceptions, and whichever
 * loses is deleted from here. Sentry is a dynamic import of `./sentryApi`,
 * loaded only when on, so it is never in the first page's JavaScript.
 *
 * Nothing personal leaves (PRD 30's rules): an outgoing event is BUILT from an
 * allowlist (scrubErrorEvent), its text masked and its addresses reduced to
 * route templates; Sentry's own collection is off at source (dataCollection);
 * the member id only after Accept (setErrorUser); nothing in a preview;
 * nothing stored on the device (no session counts, no replay, no tracing).
 *
 * Known limit: a server render during a preview can still report, without a
 * user id and with templated paths only. The server cannot see the preview
 * (it lives in the tab's sessionStorage).
 */

type SentryApi = typeof import('./sentryApi');

/**
 * Whether Sentry is on is checked inline at each entry point below, as a
 * literal `process.env.NEXT_PUBLIC_*` comparison: the build replaces it with a
 * constant and drops the branch, so with the flag off Sentry is never emitted.
 * A helper function would hide it from that folding.
 */

/**
 * Integrations that record, store or send more than the error itself:
 * breadcrumbs, sessions, tracing, replay, feedback, the console, outgoing
 * requests (their headers and paths), the visitor's locale and time zone.
 */
const DROPPED = new Set([
  'Breadcrumbs',
  'BrowserSession',
  'BrowserTracing',
  'Replay',
  'Feedback',
  'CultureContext',
  'Console',
  'Http',
  'NodeFetch',
  'ProcessSession',
  'Modules',
]);

let blocked: () => boolean = () => false;
let userId: string | null = null;
let client: SentryApi | null = null;

/** The member's id after Accept, or null (declined, unanswered, signed out, previewing). */
export function setErrorUser(id: string | null): void {
  userId = id;
  client?.setUser(id ? { id } : null);
}

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** A long opaque run (a token, a code, a key): never meaningful in an error. */
const TOKEN = /\b[A-Za-z0-9_-]{24,}\b/g;
const ABSOLUTE = /\bhttps?:\/\/[^\s"'<>)]+/g;
// A single slash: `//host` is the rest of a URL, already scrubbed above.
const PATH = /(^|[\s(=:'"])(\/(?!\/)[\w\-./%~]*)(\?[^\s"'<>)]*)?/g;
const QUOTED = /"[^"]*"/g;
const MAX_TEXT = 500;

/**
 * A path as analytics sends it: its route template, and an unknown path only
 * as `/(other)`, never itself (it could carry anything someone typed: a name
 * in a mistyped URL). As lib/analytics/scrub does.
 */
function scrubPath(path: string): string {
  const t = routeTemplate(path);
  return t === OTHER_ROUTE ? `/${OTHER_ROUTE}` : t;
}

/**
 * Free text from an error (its message, a rejection's value): no email or
 * phone, no address but its template and never a query, no id or token, and
 * no quoted span (a parse error quotes the body it choked on).
 */
export function scrubText(text: string): string {
  return maskContactDetails(text)
    .replace(ABSOLUTE, (u) => scrubUrl(u))
    .replace(PATH, (_m, lead: string, path: string) => `${lead}${scrubPath(path)}`)
    .replace(UUID, '[id]')
    .replace(TOKEN, '[redacted]')
    .replace(QUOTED, '"…"')
    .slice(0, MAX_TEXT);
}

/** A URL or path field: an origin plus template (never a query or fragment). */
function scrubAddress(value: string): string {
  return value.startsWith('/') ? scrubPath(value.split(/[?#]/)[0] ?? value) : scrubUrl(value);
}

/** "GET /mentors/ada-l" → "GET /mentors/[handle]"; a bare path or URL likewise. */
function scrubTransaction(name: string): string {
  const m = /^([A-Z]+) (.*)$/.exec(name);
  return m ? `${m[1]} ${scrubAddress(m[2] ?? '')}` : scrubAddress(name);
}

/** A frame keeps where in our code it ran; a page URL filename keeps only its template. */
function scrubFrame(f: StackFrame): StackFrame {
  const fix = (v?: string) => (v && /^https?:\/\//.test(v) ? scrubUrl(v) : v);
  return {
    filename: fix(f.filename),
    abs_path: fix(f.abs_path),
    function: f.function,
    module: f.module,
    lineno: f.lineno,
    colno: f.colno,
    in_app: f.in_app,
    context_line: f.context_line,
    pre_context: f.pre_context,
    post_context: f.post_context,
  };
}

function scrubException(x: Exception): Exception {
  return {
    type: x.type,
    value: x.value === undefined ? undefined : scrubText(x.value),
    module: x.module,
    // The mechanism's kind only: its `data` can carry handler arguments.
    mechanism: x.mechanism && { type: x.mechanism.type, handled: x.mechanism.handled },
    stacktrace: x.stacktrace && { frames: x.stacktrace.frames?.map(scrubFrame) },
  };
}

/** Contexts describing the runtime, never the request or the person. */
const SAFE_CONTEXTS = ['os', 'browser', 'runtime', 'device', 'app', 'trace'] as const;

/**
 * What leaves, for every event, browser and server alike: rebuilt from an
 * allowlist, so a field an SDK adds later never leaves unseen. Exported for tests.
 */
export function scrubErrorEvent(event: ErrorEvent): ErrorEvent | null {
  if (blocked()) return null;
  const contexts: Record<string, unknown> = {};
  for (const k of SAFE_CONTEXTS) if (event.contexts?.[k]) contexts[k] = event.contexts[k];
  const nextjs = event.contexts?.nextjs as
    { router_path?: unknown; route_type?: unknown } | undefined;
  // The matched route (a template) and its kind; never request_path, the real path.
  if (nextjs) contexts.nextjs = { router_path: nextjs.router_path, route_type: nextjs.route_type };
  return {
    type: event.type,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    sdk: event.sdk,
    fingerprint: event.fingerprint,
    message: event.message === undefined ? undefined : scrubText(event.message),
    exception: event.exception && { values: event.exception.values?.map(scrubException) },
    contexts: contexts as ErrorEvent['contexts'],
    request: event.request && {
      url: event.request.url ? scrubAddress(event.request.url) : undefined,
      method: event.request.method,
    },
    transaction: event.transaction ? scrubTransaction(event.transaction) : undefined,
    // Only the id we set: never what an SDK infers (an IP address, an email).
    user: userId ? { id: userId } : undefined,
  };
}

function options(): Parameters<SentryApi['init']>[0] {
  return {
    dsn: SENTRY_DSN,
    release: ERRORS_RELEASE,
    environment: ERRORS_ENVIRONMENT,
    // Sentry 11 collects all of these by default (it replaced sendDefaultPii):
    // every one is off, and scrubErrorEvent is the second layer.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    // No tracing option at all (even 0 turns tracing on), and no trace
    // headers on our own outgoing requests.
    tracePropagationTargets: [],
    // Fetch errors keep their own message ("Failed to fetch"), which app code compares.
    enhanceFetchErrorMessages: false,
    integrations: (defaults) => defaults.filter((i) => !DROPPED.has(i.name)),
    beforeBreadcrumb: () => null,
    beforeSend: (event) => scrubErrorEvent(event),
  };
}

/** Errors thrown before Sentry has loaded: a few are held and sent once it has. */
const early: unknown[] = [];
const EARLY_MAX = 10;
const holdError = (e: globalThis.ErrorEvent) => {
  // No error object: a cross-origin "Script error." with nothing to learn from.
  if (e.error !== undefined && e.error !== null && early.length < EARLY_MAX) early.push(e.error);
};
const holdRejection = (e: PromiseRejectionEvent) => {
  if (early.length < EARLY_MAX) early.push(e.reason);
};
const stopHolding = () => {
  window.removeEventListener('error', holdError);
  window.removeEventListener('unhandledrejection', holdRejection);
};

function started(s: SentryApi): void {
  client = s;
  if (userId) s.setUser({ id: userId });
  for (const e of early.splice(0)) if (!blocked()) s.captureException(e);
}

/**
 * The browser half (instrumentation-client.ts). `isBlocked` is passed in and
 * read per event (a preview, PRD 27), so it holds from the first error, before
 * React has mounted anything. Early errors are held at once; Sentry loads when
 * the page is idle and sends them.
 */
export function startClientErrors(isBlocked: () => boolean): void {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'true' || !SENTRY_DSN) return;
  if (typeof window === 'undefined') return;
  blocked = isBlocked;
  window.addEventListener('error', holdError);
  window.addEventListener('unhandledrejection', holdRejection);
  const load = () =>
    import('./sentryApi')
      .then((s) => {
        s.init({ ...options(), tunnel: SENTRY_TUNNEL_PATH });
        // Sentry's own handlers take over from here.
        stopHolding();
        started(s);
      })
      .catch(() => {
        // Blocked by an extension, or offline: the app works without it.
        stopHolding();
        early.length = 0;
      });
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => void load(), { timeout: 4000 });
  } else setTimeout(() => void load(), 2000);
}

/** The server half (instrumentation.ts `register`), Node and edge. */
export async function startServerErrors(): Promise<void> {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'true' || !SENTRY_DSN) return;
  const s = await import('./sentryApi');
  s.init(options());
  started(s);
}

/** Next's `onRequestError` hook: a server render or route handler that threw. */
export async function reportRequestError(
  ...args: Parameters<SentryApi['captureRequestError']>
): Promise<void> {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'true' || !SENTRY_DSN) return;
  const s = client ?? (await import('./sentryApi'));
  s.captureRequestError(...args);
}

/**
 * The tunnel (app/api/monitoring/route.ts): Sentry's own handler, which
 * forwards envelopes for our DSN only (403 for any other, so the route can't
 * be pointed at another host), never the browser's cookies or headers, and
 * refuses a body without a length or over its cap.
 */
export async function tunnel(request: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'true' || !SENTRY_DSN) {
    return new Response(null, { status: 404 });
  }
  const { createSentryTunnelRoute } = await import('@sentry/nextjs/tunnel');
  return createSentryTunnelRoute({ allowedDsns: [SENTRY_DSN] }).POST(request);
}

/** Tests only. */
export function resetErrorsForTests(): void {
  blocked = () => false;
  userId = null;
  client = null;
  early.length = 0;
}
