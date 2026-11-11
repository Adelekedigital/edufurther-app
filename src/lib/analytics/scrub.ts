import { routeTemplate } from './route';

/**
 * What of an address may leave the browser (PRD 30, Privacy): our own pages
 * as their route template (`/mentors/[handle]`, `/invite/[code]`: no handle,
 * id or code), another site as its origin only, and never a query string or
 * fragment (a `?viewAs=` email, `next=`, booking ids, sign-in tokens).
 */
export function scrubUrl(value: string): string {
  if (value.startsWith('/')) return routeTemplate(value);
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const u = new URL(value);
    const ours = typeof window !== 'undefined' && u.origin === window.location.origin;
    return ours ? `${u.origin}${routeTemplate(u.pathname)}` : u.origin;
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
