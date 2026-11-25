/** What a mentor link can be built from: the readable slug when there is one. */
export type MentorPathSource = { slug?: string | null; handle?: string | null; id: string };

/**
 * A mentor's profile path, `/mentors/{slug | handle | id}`: the one place it
 * is built, so every link moves to the slug as soon as the API sends one. The
 * route takes the id too, and 308s it to the slug (mentors/[handle]/page.tsx).
 * Undefined query values are left out.
 */
export function mentorProfilePath(
  m: MentorPathSource,
  query?: Record<string, string | undefined>,
): string {
  const path = `/mentors/${encodeURIComponent(m.slug || m.handle || m.id)}`;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) q.set(k, v);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * How a profile link was passed on, as its `?via=` (backend decisions 346,
 * 347): the Copy button, the device's share sheet, or an invite. The visit
 * it brings is counted by it.
 */
export type ProfileVia = 'copy' | 'share' | 'invite';

/** The query key the channel travels in. */
export const VIA_PARAM = 'via';

/**
 * The profile link as it goes out by one channel: `via` set, every other
 * param kept (`?book=`). Added only at the copy or the share, since the
 * channel isn't known before, so the link on screen stays bare.
 */
export function withProfileVia(url: string, via: ProfileVia): string {
  try {
    const u = new URL(url);
    u.searchParams.set(VIA_PARAM, via);
    return u.toString();
  } catch {
    // Not absolute: the link goes out as it was rather than not at all.
    return url;
  }
}

/**
 * A legacy Bubble id (`1726837410805x205680694778626500`), a User's or a
 * mentor record's. Old app links carry it (`/profile/{id}`); the API resolves
 * it as a mentor handle (backend, 2026-11-25), and never mints a slug of this
 * shape, so the two can't collide.
 */
const LEGACY_ID = /^\d{6,20}x\d{6,24}$/;
export const isLegacyId = (handle: string) => LEGACY_ID.test(handle);

/** A request's own query (?book=, ?tab=, …) as `?a=1&b=2`, repeated keys kept; '' when empty. */
export function queryString(q: Record<string, string | string[] | undefined>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) out.append(k, one);
  const s = out.toString();
  return s ? `?${s}` : '';
}
