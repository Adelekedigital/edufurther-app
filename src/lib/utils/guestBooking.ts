/**
 * The booking a guest left to sign up (PRD H1 guest path, F1): read from
 * `/onboarding?for={handle}&sid={session_type_id}&time={iso}`. Never trusted
 * as given: each part is checked the way safeReturnTo checks a path, and
 * anything off means "no guest booking" (the normal flow runs).
 */
export type GuestBooking = { handle: string; sid: string; time: string | null };

/**
 * Handles and session-type ids as they are minted: letters, digits, - and _.
 * The sign-in side builds the link with the same rules (`_auth/booking.ts`),
 * so a link it makes always reads back here.
 */
export const BOOKING_TOKEN = /^[A-Za-z0-9_-]{1,128}$/;
/** A full instant ("2026-10-20T10:00:00Z"; fractions and offsets allowed). */
export const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function parseGuestBooking(q: URLSearchParams): GuestBooking | null {
  const handle = q.get('for');
  const sid = q.get('sid');
  if (!handle || !BOOKING_TOKEN.test(handle) || !sid || !BOOKING_TOKEN.test(sid)) return null;
  const raw = q.get('time');
  // A bad time only drops the time: the flow opens on the slot grid instead.
  const time = raw && ISO_INSTANT.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : null;
  return { handle, sid, time };
}
