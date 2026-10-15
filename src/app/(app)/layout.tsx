'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/templates/AppShell/AppShell';
import { useAppShell } from '@/app/_shell/useAppShell';
import { useOnline } from '@/lib/utils/useOnline';

/**
 * Which nav item the current route is, by its first path segment. The shell is
 * mounted once in this layout (ADR 0007), so `active` is derived from the
 * pathname rather than passed per screen. `/dashboard` and the (unbuilt)
 * `/home` are both Home; the rest map to their nav label.
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
  useFocusMainOnRouteChange(pathname);

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

/**
 * Move focus to the new page on a client-side route change. With the shell
 * persistent, Next leaves focus on the nav link that was clicked; a keyboard or
 * screen-reader user should land on the new content instead (accessibility:
 * route change → the `<h1>`, or the `<main>` landmark it falls back to while the
 * page is still loading its heading). Skipped on first mount, so a fresh load or
 * entry from a non-group route keeps the browser's own focus, and never
 * scroll-jumps (`preventScroll`).
 */
function useFocusMainOnRouteChange(pathname: string) {
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const main = document.getElementById('main');
    if (!main) return;
    const target = main.querySelector<HTMLElement>('h1') ?? main;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [pathname]);
}
