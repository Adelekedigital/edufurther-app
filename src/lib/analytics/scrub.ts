import { maskContactDetails } from '@/lib/utils/contactDetails';
import { OTHER_ROUTE, routeTemplate } from './route';

/** A route template as a path: an unknown page is the `/(other)` bucket, never its real path. */
const pathOf = (pathname: string) => {
  const t = routeTemplate(pathname);
  return t === OTHER_ROUTE ? `/${OTHER_ROUTE}` : t;
};

/**
 * What of an address may leave the browser (PRD 30, Privacy): our own pages
 * as their route template (`/mentors/[handle]`, `/invite/[code]`: no handle,
 * id or code), another site as its origin only, and never a query string or
 * fragment (a `?viewAs=` email, `next=`, booking ids, sign-in tokens).
 */
export function scrubUrl(value: string): string {
  if (value.startsWith('/')) return pathOf(value);
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const u = new URL(value);
    const ours = typeof window !== 'undefined' && u.origin === window.location.origin;
    return ours ? `${u.origin}${pathOf(u.pathname)}` : u.origin;
  } catch {
    return value;
  }
}

/** The SDK's own address properties (and their person-property copies). */
const URL_KEYS = new Set([
  '$current_url',
  '$pathname',
  '$referrer',
  '$initial_current_url',
  '$initial_pathname',
  '$initial_referrer',
  '$session_entry_url',
  '$session_entry_pathname',
  '$session_entry_referrer',
  '$prev_pageview_pathname',
  '$external_click_url',
]);

/** Every address property scrubbed, at the top level and in `$set` / `$set_once`. */
export function scrubProperties(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && URL_KEYS.has(k)) out[k] = scrubUrl(v);
    else if ((k === '$set' || k === '$set_once') && v && typeof v === 'object')
      out[k] = scrubProperties(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
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
 * Free text from an error (a message, a rejection's value), for every error
 * tracker (lib/vendor/errors, and PostHog's exceptions in lib/vendor/analytics):
 * no email or phone, no address but its template and never a query, no id or
 * token, and no quoted span (a parse error quotes the body it choked on).
 */
export function scrubText(text: string): string {
  return maskContactDetails(text)
    .replace(ABSOLUTE, (u) => scrubUrl(u))
    .replace(PATH, (_m, lead: string, path: string) => `${lead}${pathOf(path)}`)
    .replace(UUID, '[id]')
    .replace(TOKEN, '[redacted]')
    .replace(QUOTED, '"…"')
    .slice(0, MAX_TEXT);
}

/**
 * A stack frame's file, for every error tracker: our own built code
 * (`/_next/...`, no personal data) keeps its path, so traces still say where
 * it ran; a page's own address (an inline script) is reduced like any address.
 */
export function scrubFrameFile<T>(file: T): T | string {
  if (typeof file !== 'string' || !/^https?:\/\//.test(file)) return file;
  try {
    const u = new URL(file);
    if (u.pathname.startsWith('/_next/')) return `${u.origin}${u.pathname}`;
  } catch {
    return file;
  }
  return scrubUrl(file);
}

/**
 * An error's type as an identifier (TypeError, ApiError), or 'Error': a
 * rejected data object's `name` (a person's) is not a type.
 */
export function scrubErrorType<T>(type: T): T | string {
  return typeof type === 'string' && /^[A-Za-z_$][\w$.]{0,63}$/.test(type) ? type : 'Error';
}
