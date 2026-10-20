/**
 * Sign-in settings that other screens share. Change a route or a link here,
 * not where it is used (PRD: Sign up and log in).
 */

/** Legal line links (handoff, Legal). The Community guide has no page yet, so it is the Terms. */
export const LEGAL_LINKS = {
  terms: 'https://edufurther.org/terms',
  privacy: 'https://edufurther.org/privacy',
  communityGuide: 'https://edufurther.org/terms',
} as const;

/** The suspended screen's Contact support (PRD Q1: use it unless told otherwise). */
export const SUPPORT_EMAIL = 'support@edufurther.org';

/**
 * Where a new mentee goes after creating an account while onboarding is off
 * (owner, 2026-10-17). With it on, see `newAccountDestination`.
 */
export const NEW_MENTEE_HOME = '/home';

/**
 * Where a new mentor goes while mentor onboarding is off (owner, 2026-10-17):
 * with no mentor profile yet, /dashboard would only bounce them to /home.
 */
export const NEW_MENTOR_HOME = '/home';

/**
 * Mentee onboarding is switched on per environment; the /onboarding route
 * 404s while it is off.
 */
export const ONBOARDING_LIVE = process.env.NEXT_PUBLIC_ONBOARDING_ENABLED === 'true';

/**
 * Mentor onboarding (`/onboarding/mentor`, `/mentor-application`, Mentor
 * onboarding PRD) ships on its own flag.
 */
export const MENTOR_ONBOARDING_LIVE = process.env.NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED === 'true';

/** A booking interrupted by sign-up, handed to onboarding (its PRD, guest path). */
export type PendingBooking = { handle: string; sid: string; time: string };

/**
 * Where a brand-new account goes (PRD rev 9, agreed with the onboarding
 * session). With onboarding on: always the /onboarding entry, which opens the
 * mentee or mentor page by role, keeping the query (`role=mentor` for a mentor
 * sign-up; the interrupted booking as `for/sid/time`). With it off: a mentor
 * to mentor onboarding if that is on, else NEW_MENTOR_HOME; a mentee straight
 * back to the booking (a checked `next`), else NEW_MENTEE_HOME, so nothing is
 * lost to a route that doesn't exist.
 */
export function newAccountDestination({
  role,
  booking,
  next,
}: {
  role: 'mentee' | 'mentor';
  booking?: PendingBooking | null;
  next?: string | null;
}): string {
  if (ONBOARDING_LIVE) {
    const q = new URLSearchParams();
    if (role === 'mentor') q.set('role', 'mentor');
    if (booking) {
      q.set('for', booking.handle);
      q.set('sid', booking.sid);
      q.set('time', booking.time);
    }
    const query = q.toString();
    return query ? `/onboarding?${query}` : '/onboarding';
  }
  // The role is already on the account (useSignInFlow); the query is a hint only.
  if (role === 'mentor')
    return MENTOR_ONBOARDING_LIVE ? '/onboarding/mentor?role=mentor' : NEW_MENTOR_HOME;
  return next ?? NEW_MENTEE_HOME;
}
