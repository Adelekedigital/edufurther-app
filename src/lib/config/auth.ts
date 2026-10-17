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
 * Where a new mentee goes after creating an account. `/home` until Mentee
 * onboarding ships, then `/onboarding` (owner, 2026-10-17).
 */
export const NEW_MENTEE_HOME = '/home';

/**
 * Where a new mentor goes. `/home` until Mentor onboarding names its route
 * (owner, 2026-10-17): with no mentor profile yet, /dashboard would only bounce
 * them through / to /home.
 */
export const NEW_MENTOR_HOME = '/home';
