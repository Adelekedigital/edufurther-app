/**
 * A pathname as its route template (`/mentors/ada-l` → `/mentors/[handle]`),
 * so a handle, an id or an invite code never leaves the browser in an event
 * (PRD 30, Privacy). The list mirrors `src/app`'s pages; route.test.ts fails
 * when a page is added without it. Anything not listed is `(other)`: an
 * unknown path could carry anything someone typed.
 */
const ROUTES = [
  '/',
  '/admin',
  '/admin/analytics',
  '/admin/credits',
  '/admin/emails',
  '/admin/emails/[key]',
  '/admin/mentors',
  '/bookings',
  '/calendar',
  '/dashboard',
  '/explore',
  '/home',
  '/integrations',
  '/invite/[code]',
  '/login',
  '/mentor-application',
  '/mentors/[handle]',
  '/messages',
  '/onboarding',
  '/onboarding/mentee',
  '/onboarding/mentor',
  '/session-types',
  '/session-types/[id]/edit',
  '/session-types/new',
  '/sessions/[id]',
  '/settings',
  '/settings/[tab]',
  '/signup',
] as const;

export const ROUTE_TEMPLATES: readonly string[] = ROUTES;

export const OTHER_ROUTE = '(other)';

const split = (p: string) => p.split('/').filter(Boolean);
const TEMPLATES = ROUTES.map((t) => ({ template: t, parts: split(t) }));
const isParam = (s: string) => s.startsWith('[') && s.endsWith(']');

/** A static segment beats a dynamic one (`/session-types/new` is not `[id]`). */
export function routeTemplate(pathname: string): string {
  const parts = split(pathname.split(/[?#]/)[0] ?? '');
  let best: { template: string; dynamic: number } | null = null;
  for (const t of TEMPLATES) {
    if (t.parts.length !== parts.length) continue;
    let dynamic = 0;
    const fits = t.parts.every((seg, i) => {
      if (isParam(seg)) return ++dynamic > 0;
      return seg === parts[i];
    });
    if (fits && (!best || dynamic < best.dynamic)) best = { template: t.template, dynamic };
  }
  return best?.template ?? OTHER_ROUTE;
}
