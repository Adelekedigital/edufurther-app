import type { PendingBooking } from '@/lib/config/auth';

const BASE = 'https://edufurther.invalid';
const PROFILE = /^\/mentors\/([^/]+)$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * The booking a `next` points back to, if it is one: the profile's reopen
 * link (`/mentors/{handle}?book={type}&at={instant}`, how the booking modal's
 * Google sign-in comes back). `next` is already same-site (safeReturnTo);
 * this only reads it, and anything that isn't that shape is no booking.
 */
export function bookingFromNext(next: string | null): PendingBooking | null {
  if (!next) return null;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return null;
  }
  const handle = PROFILE.exec(url.pathname)?.[1];
  const sid = url.searchParams.get('book');
  const time = url.searchParams.get('at');
  if (!handle || !sid || !time || !ISO_INSTANT.test(time)) return null;
  return { handle: decodeURIComponent(handle), sid, time };
}

/** A `next` into onboarding itself (a guest sent to sign up from /onboarding?…). */
export function isOnboardingNext(next: string | null): boolean {
  if (!next) return false;
  const path = new URL(next, BASE).pathname;
  return path === '/onboarding' || path.startsWith('/onboarding/');
}
