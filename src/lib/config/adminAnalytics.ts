/**
 * Admin Analytics (`/admin/analytics` and its admin nav item) ships behind one
 * flag (PRD 31, founder: "all at once"): it goes on once PRD 30's tracking
 * (PRs 1 to 6) and the backend routes are live. Off, the page is not found and
 * nothing links to it.
 */
export const ADMIN_ANALYTICS_LIVE = process.env.NEXT_PUBLIC_ADMIN_ANALYTICS_ENABLED === 'true';
