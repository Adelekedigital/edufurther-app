/**
 * The mentor landing hint (owner, 2026-11-01): a mentor whose browser load
 * opens on Explore (an installed app that still starts there, a bookmark, a
 * restored tab) goes to their own home before any of Explore is drawn.
 *
 * The browser writes the signed-in mentor's home here once /me says who they
 * are (useLandingHint); the proxy reads it on a document request for
 * /explore and redirects. A hint only, never access: it is honoured only for
 * the user id the proxy just verified and only toward a mentor home, whose
 * own page still checks the real role. Mentees and guests never get one.
 */
export const LANDING_COOKIE = 'ef-landing';

/** The pages that redirect a landing mentor. */
export const LANDING_PATHS: ReadonlySet<string> = new Set(['/explore']);

/** Every home a mentor-side member can have (memberHome); nothing else is honoured. */
export const MENTOR_HOMES: ReadonlySet<string> = new Set([
  '/dashboard',
  '/mentor-application',
  '/onboarding/mentor',
]);

/** A year: the role is set at sign-up and sticks; the value is rewritten on every visit. */
export const LANDING_MAX_AGE = 60 * 60 * 24 * 365;

export function encodeLanding(userId: string, home: string): string {
  return `${userId}:${home}`;
}

/** The home to send `userId` to, or null: no hint, another account's, or not a mentor home. */
export function landingHomeFor(raw: string | undefined, userId: string): string | null {
  if (!raw) return null;
  // Written URI-encoded; a cookie parser may or may not have decoded it.
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const at = value.indexOf(':');
  if (at <= 0 || value.slice(0, at) !== userId) return null;
  const home = value.slice(at + 1);
  return MENTOR_HOMES.has(home) ? home : null;
}
