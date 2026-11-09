/**
 * Admin Emails (`/admin/emails`, its editor and the admin nav item) ships
 * behind one flag until the backend routes are live (PRD 28). Off, the pages
 * are not found and nothing links to them.
 */
export const ADMIN_EMAILS_LIVE = process.env.NEXT_PUBLIC_ADMIN_EMAILS_ENABLED === 'true';
