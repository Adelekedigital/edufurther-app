import { OTHER_ROUTE, routeTemplate } from '@/lib/analytics/route';

/**
 * Pages a signed-out visitor may open (owner, 2026-11-12): Explore and mentor
 * profiles (browse, and book as a guest), invite links, and the ways in. `/`
 * routes each viewer to their own home itself.
 */
const PUBLIC_PAGES = new Set([
  '/',
  '/explore',
  '/mentors/[handle]',
  '/invite/[code]',
  '/login',
  '/signup',
]);

/**
 * Whether a signed-out visitor is sent to log in for this path: every page the
 * app has (the route list that mirrors `src/app`) except the public ones, so a
 * new screen is members-only unless it's added above. An unknown path isn't a
 * page: it gets the 404, never a login. Route handlers (`/auth/...`,
 * `/sessions/{id}/enter`) aren't pages either.
 */
export function loginRequired(pathname: string): boolean {
  const template = routeTemplate(pathname);
  return template !== OTHER_ROUTE && !PUBLIC_PAGES.has(template);
}

/** Where a signed-out visitor goes instead, back to this page after logging in. */
export function loginPathFor(pathname: string, search: string): string {
  return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
}
