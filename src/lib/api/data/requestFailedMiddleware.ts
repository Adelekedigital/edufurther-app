import type { Middleware } from 'openapi-fetch';
import { track } from '@/lib/analytics/track';
import { routeTemplate } from '@/lib/analytics/route';

/**
 * `request_failed` (PRD 30, error rate by screen): every failed call the
 * generated client makes, counted here and nowhere else. The rate, never the
 * message: the screen's route template, a status bucket, and the problem
 * `type`'s last segment (`/problems/insufficient-credit` → `insufficient-credit`).
 *
 * Not counted:
 * - 401: an ended session, which the auth middleware renews or signs out;
 * - the analytics ingest path, so a failing collector can't report itself;
 * - an aborted call (a query cancelled on unmount): nothing failed.
 *
 * Known gap: the auth middleware's retry after a refreshed 401 is its own
 * fetch; a network error there throws out of its onResponse, past this one,
 * and isn't counted. A failed answer to the retry is counted.
 */

/**
 * Problem types are short slugs. Only our backend's problem types reach this
 * client, so anything else (or longer) is reported as the status alone.
 */
const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

/**
 * One event per (route, bucket, kind) a minute at most: a query's retry, a
 * 30 s poll or a refetch storm failing the same way is one signal, not dozens.
 */
export const DEDUPE_MS = 60_000;
const lastSent = new Map<string, number>();

function send(props: {
  route: string;
  status_bucket: '4xx' | '5xx' | 'network';
  kind: string;
}): void {
  const key = `${props.route}|${props.status_bucket}|${props.kind}`;
  const now = Date.now();
  const last = lastSent.get(key);
  if (last !== undefined && now - last < DEDUPE_MS) return;
  lastSent.set(key, now);
  track('request_failed', props);
}

/** Tests only: forget what was sent. */
export function resetRequestFailedForTests(): void {
  lastSent.clear();
}

type Problem = { type?: unknown };

/** The problem `type`'s last segment, or `http_<status>` when there is none. */
async function kindOf(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as Problem | null;
    const type = body && typeof body === 'object' ? body.type : undefined;
    const slug = typeof type === 'string' ? type.split('/').filter(Boolean).pop() : undefined;
    if (slug && SLUG.test(slug)) return slug;
  } catch {
    // Not JSON (a proxy's HTML page, an empty body): the status says enough.
  }
  return `http_${response.status}`;
}

function isIngest(url: string): boolean {
  try {
    return /(^|\/)ingest(\/|$)/.test(new URL(url, 'http://x').pathname);
  } catch {
    return false;
  }
}

/** Where the person is, as its template; nothing on the server side. */
function currentRoute(): string | null {
  if (typeof window === 'undefined') return null;
  return routeTemplate(window.location.pathname);
}

export function createRequestFailedMiddleware(): Middleware {
  return {
    async onResponse({ request, response }) {
      const s = response.status;
      if (s < 400 || s === 401 || isIngest(request.url)) return response;
      const route = currentRoute();
      if (route === null) return response;
      send({
        route,
        status_bucket: s >= 500 ? '5xx' : '4xx',
        kind: await kindOf(response),
      });
      return response;
    },
    onError({ request, error }) {
      if (isIngest(request.url)) return;
      // Cancelled is not failed; a timeout (AbortSignal.timeout) is.
      const name = (error as { name?: unknown } | null)?.name;
      if (name === 'AbortError') return;
      if (request.signal?.aborted && name !== 'TimeoutError') return;
      const route = currentRoute();
      if (route === null) return;
      send({ route, status_bucket: 'network', kind: 'network' });
    },
  };
}
