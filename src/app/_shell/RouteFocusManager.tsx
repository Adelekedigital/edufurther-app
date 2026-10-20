'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Moves focus to the page heading on client-side route changes, app-wide.
 *
 * Mounted once at the root (ADR 0007), it persists across every navigation —
 * within the `(app)` shell, into it from a flat route such as a mentor profile,
 * or anywhere else — so "skip the first render" means only the initial document
 * load. On that load the browser places focus itself; on any later client
 * navigation the previously focused control has unmounted (otherwise focus
 * silently falls to `<body>`), so focus is moved to the new page's `<h1>`, or
 * the `<main>` landmark while the heading is still loading.
 *
 * A route change before the person has clicked, tapped or pressed a key is a
 * redirect while the page loads (e.g. /settings to the role's first tab), so
 * it's treated as the initial load too: focus isn't moved, and no ring shows on
 * a heading nobody reached for.
 *
 * Keyed off the previous pathname, so React Strict Mode's dev-only double-invoke
 * (the pathname is equal across it) is a no-op and the initial load is never
 * mistaken for a navigation. Never scroll-jumps (`preventScroll`). A route with
 * no `#main` (e.g. the focused session view) is left to manage its own focus.
 */
export function RouteFocusManager() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  const acted = useRef(false);
  useEffect(() => {
    const mark = () => {
      acted.current = true;
    };
    document.addEventListener('pointerdown', mark, { capture: true, once: true });
    document.addEventListener('keydown', mark, { capture: true, once: true });
    return () => {
      document.removeEventListener('pointerdown', mark, { capture: true });
      document.removeEventListener('keydown', mark, { capture: true });
    };
  }, []);
  useEffect(() => {
    const prev = prevPathname.current;
    if (prev === pathname) return; // StrictMode double-invoke / same-path re-render
    prevPathname.current = pathname;
    if (prev === null) return; // initial document load — keep the browser's own focus
    if (!acted.current) return; // a redirect during that load, not a navigation
    const main = document.getElementById('main');
    if (!main) return;
    const target = main.querySelector<HTMLElement>('h1') ?? main;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
