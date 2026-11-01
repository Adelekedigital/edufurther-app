import { MENTOR_ONBOARDING_LIVE } from '@/lib/config/auth';

/**
 * The mentor landing hint (owner, 2026-11-01): a mentor whose browser load
 * opens on Explore (an installed app that still starts there, a bookmark, a
 * typed address, a restored tab) goes to their own home before any of Explore
 * is drawn.
 *
 * Set by the server (`/api/landing-hint`, HttpOnly) for the Supabase user it
 * verified, once the app knows the viewer's home; read by the proxy on a real
 * landing (isLanding). A hint only, never access: honoured only for the user
 * id the proxy just verified and only toward a mentor home, whose own page
 * still checks the real role. Mentees and guests never have one.
 */
export const LANDING_COOKIE = 'ef-landing';

/**
 * Set (for the browser session only) once a mentor has Explore on screen:
 * they chose it, since a landing never draws it. While it is there the proxy
 * leaves Explore alone, so a reload, Back, or pull-to-refresh keeps it, even
 * where the browser reports those as `none` (isLanding).
 */
export const CHOSE_EXPLORE_COOKIE = 'ef-chose-explore';

/** The pages that redirect a landing mentor. */
export const LANDING_PATHS: ReadonlySet<string> = new Set(['/explore']);

/** A year: the role is set at sign-up and sticks; the value is rewritten on visits. */
export const LANDING_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Every home a mentor-side member can have (memberHome). The application and
 * mentor onboarding only while their pages are on: off, they 404.
 */
export function isMentorHome(home: string): boolean {
  if (home === '/dashboard') return true;
  return (
    MENTOR_ONBOARDING_LIVE && (home === '/mentor-application' || home === '/onboarding/mentor')
  );
}

export function encodeLanding(userId: string, home: string): string {
  return `${userId}:${home}`;
}

/** The home to send `userId` to, or null: no hint, another account's, or not a mentor home. */
export function landingHomeFor(raw: string | undefined, userId: string): string | null {
  if (!raw) return null;
  // A cookie parser may or may not have decoded it already.
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const at = value.indexOf(':');
  if (at <= 0 || value.slice(0, at) !== userId) return null;
  const home = value.slice(at + 1);
  return isMentorHome(home) ? home : null;
}

/**
 * Where this browser load landed, from the browser's own fetch metadata: a
 * page (not a fetch) the person opened themselves (`none`: an app launch, a
 * bookmark, a typed address, a restored tab). In-app navigation and
 * prefetches are fetches; a link from another page, ours or another site's,
 * is not `none`. Without the headers (an old browser), never a landing.
 */
export function isLanding(headers: Headers): boolean {
  return headers.get('sec-fetch-dest') === 'document' && headers.get('sec-fetch-site') === 'none';
}
