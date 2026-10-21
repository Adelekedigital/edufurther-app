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
/** Where the next route change may keep focus; any route change clears it. */
let skipFor: string | null = null;

/**
 * Call just before a route change that isn't a new page for the person: a
 * redirect as the page loads (/settings to the role's first tab), or a tab
 * that is its own URL (Settings). Arriving at `path` keeps focus where it is,
 * so no ring lands on a heading nobody reached for. Tied to the destination:
 * if another navigation wins instead, that one still moves focus.
 */
export function skipNextRouteFocus(path: string) {
  skipFor = path;
}

/**
 * Put focus on the page's heading, or the `<main>` landmark while the heading
 * is still loading. Shared with anything that removes the control a person was
 * focused on: without it focus falls to `<body>` and the next Tab starts from
 * the top of the page.
 */
export function focusPageHeading() {
  const main = document.getElementById('main');
  if (!main) return;
  const target = main.querySelector<HTMLElement>('h1') ?? main;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

export function RouteFocusManager() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPathname.current;
    if (prev === pathname) return; // StrictMode double-invoke / same-path re-render
    prevPathname.current = pathname;
    if (prev === null) return; // initial document load — keep the browser's own focus
    const skip = skipFor === pathname;
    skipFor = null;
    if (skip) return; // a redirect or a tab, not a new page
    focusPageHeading();
  }, [pathname]);
  return null;
}
