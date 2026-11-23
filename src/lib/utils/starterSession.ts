/**
 * The session type mentor onboarding makes for every new mentor (owner,
 * 2026-11-23). Kept apart from the onboarding hooks so a screen that only
 * needs to find the starter doesn't pull them in.
 */
export const STARTER_NAME = '1:1 mentorship session';

/** What the starter was called before 2026-11-23; dev accounts still have one. */
const LEGACY_STARTER_NAME = 'Intro chat';

/** A session type named as the starter, today's name or the old one (case and spaces ignored). */
export function isStarterName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === STARTER_NAME.toLowerCase() || n === LEGACY_STARTER_NAME.toLowerCase();
}
