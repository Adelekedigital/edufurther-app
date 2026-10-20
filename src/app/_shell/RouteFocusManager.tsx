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
 * Keyed off the previous pathname, so React Strict Mode's dev-only double-invoke
 * (the pathname is equal across it) is a no-op and the initial load is never
 * mistaken for a navigation. Never scroll-jumps (`preventScroll`). A route with
 * no `#main` (e.g. the focused session view) is left to manage its own focus.
 */
/** Set by a redirect that isn't a navigation; the next route change consumes it. */
let skipNext = false;

/**
 * Call just before a redirect that happens as the page loads (e.g. /settings
 * to the role's first tab): that route change keeps focus where it is, so no
 * ring lands on a heading nobody reached for. Every other route change still
 * moves focus, whatever started it (a screen reader's synthetic click too).
 */
export function skipNextRouteFocus() {
  skipNext = true;
}

export function RouteFocusManager() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPathname.current;
    if (prev === pathname) return; // StrictMode double-invoke / same-path re-render
    prevPathname.current = pathname;
    if (prev === null) return; // initial document load — keep the browser's own focus
    if (skipNext) {
      skipNext = false; // a load-time redirect, not a navigation
      return;
    }
    const main = document.getElementById('main');
    if (!main) return;
    const target = main.querySelector<HTMLElement>('h1') ?? main;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
