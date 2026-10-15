'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { useAppShell } from '@/app/_shell/useAppShell';
import { useOnline } from '@/lib/utils/useOnline';

/**
 * Which nav item the current route is, by its first path segment. The shell is
 * mounted once in this layout (ADR 0007), so `active` is derived from the
 * pathname rather than passed per screen. `/dashboard` and the (unbuilt)
 * `/home` are both Home; the rest map to their nav label. `home` and `settings`
 * are forward-looking — neither route is live in the group yet (mentee Home
 * resolves to `/explore`, `/settings` isn't built) — kept so `active` is already
 * right when they ship.
 */
const ACTIVE_BY_SEGMENT: Record<string, string> = {
  dashboard: 'Home',
  home: 'Home',
  bookings: 'Bookings',
  calendar: 'Calendar',
  explore: 'Explore',
  integrations: 'Integration',
  'session-types': 'Sessions',
  settings: 'Settings',
};

export function activeFor(pathname: string): string {
  const segment = pathname.split('/')[1] ?? '';
  return ACTIVE_BY_SEGMENT[segment] ?? '';
}

/**
 * The app shell, rendered once for every route in this group (Dashboard,
 * Bookings, Calendar, Explore, Integrations, Session types). It stays mounted
 * while the user moves between these routes — only `children` changes — so the
 * sidebar, header and account menu never unmount and the screen never blanks
 * (ADR 0007). Viewer-aware through `useAppShell` exactly as the per-screen
 * shell was: guest chrome for guests, member chrome for members, the mentor or
 * mentee nav, the account menu and credits.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { chrome, account, nav } = useAppShell();
  const online = useOnline();

  return (
    <AppShell
      active={activeFor(pathname)}
      nav={nav}
      chrome={chrome}
      account={account}
      offline={!online}
    >
      {children}
    </AppShell>
  );
}
