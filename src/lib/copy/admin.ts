/**
 * The admin app (Admin PRD; Admin.dc.html). Shared by Mentors and Credits:
 * the page headers and the failed-action toast. Reviewed against the
 * ux-writer rules.
 */

export const ADMIN_PAGES = {
  mentors: {
    title: 'Mentors',
    subtitle: 'Review applications and look after approved mentors.',
  },
  credits: {
    title: 'Credits',
    // v1 shows the rules read-only (founder, 2026-10-26; PRD Q7).
    subtitle: 'Add session credits for a mentee, see every change and check the monthly rules.',
  },
} as const;

/** Any admin action the API refused or that never arrived: nothing changed. */
export const ADMIN_ACTION_FAILED = 'That didn’t go through. Nothing changed, try again.';
