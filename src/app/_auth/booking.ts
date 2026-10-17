import type { PendingBooking } from '@/lib/config/auth';

const BASE = 'https://edufurther.invalid';
const PROFILE = /^\/mentors\/([^/]+)$/;
/** Handles and session-type ids as they are minted: letters, digits, - and _. */
const TOKEN = /^[A-Za-z0-9_-]{1,128}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** `next` as a same-site URL, or null. Never throws. */
function sameSite(next: string | null): URL | null {
  if (!next) return null;
  try {
    const url = new URL(next, BASE);
    return url.origin === BASE ? url : null;
  } catch {
    return null;
  }
}

/**
 * The booking a `next` points back to, if it is one: the profile's reopen
 * link (`/mentors/{handle}?book={type}&at={instant}`, how the booking modal's
 * Google sign-in comes back). Every part is bounded to the shape we mint, as
 * it is passed on to onboarding; anything else is no booking.
 */
export function bookingFromNext(next: string | null): PendingBooking | null {
  const url = sameSite(next);
  const raw = url && PROFILE.exec(url.pathname)?.[1];
  if (!url || !raw) return null;
  let handle: string;
  try {
    handle = decodeURIComponent(raw);
  } catch {
    return null; // a malformed escape: not a link we made
  }
  const sid = url.searchParams.get('book');
  const time = url.searchParams.get('at');
  if (!TOKEN.test(handle) || !sid || !TOKEN.test(sid) || !time || !ISO_INSTANT.test(time)) {
    return null;
  }
  return { handle, sid, time };
}

/** A same-site `next` into onboarding itself (a guest sent to sign up from /onboarding?…). */
export function isOnboardingNext(next: string | null): boolean {
  const path = sameSite(next)?.pathname;
  return path === '/onboarding' || !!path?.startsWith('/onboarding/');
}

/**
 * The mentor a booking `next` is about: the profile's reopen link, or a link
 * into onboarding carrying the booking (`/onboarding?for={handle}…`). Bounded
 * like the rest; anything else is no mentor.
 */
export function bookingMentorHandle(next: string | null): string | null {
  const booking = bookingFromNext(next);
  if (booking) return booking.handle;
  if (!isOnboardingNext(next)) return null;
  // A whole booking only (for, sid and time), like the reopen link: a bare
  // `for` names a mentor with nothing booked.
  const q = sameSite(next)?.searchParams;
  const handle = q?.get('for') ?? null;
  const sid = q?.get('sid') ?? null;
  const time = q?.get('time') ?? null;
  const whole =
    !!handle && TOKEN.test(handle) && !!sid && TOKEN.test(sid) && !!time && ISO_INSTANT.test(time);
  return whole ? handle : null;
}
