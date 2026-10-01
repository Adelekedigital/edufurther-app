'use client';

import { useEffect, useRef } from 'react';

/**
 * Unsaved-changes guards, app-wide (product, 2026-10-01). A form with edits it
 * hasn't saved calls `useLeaveGuard(dirty, 'your About section')` and is then
 * protected however the user leaves:
 * - an in-app link (sidebar, tabs, cards): AppShell asks "Discard your
 *   changes?" (Keep editing / Discard) before following it;
 * - Logout: the same question, before the session ends;
 * - reload, close, a typed address: the browser's own "Leave site?" prompt
 *   (browsers allow no custom dialog there).
 * The browser's Back button isn't caught yet (tracked as an issue).
 */
const dirtyGuards = new Map<symbol, string>();
const discarded = new Set<symbol>();
let released = false;

/** True while any mounted form has changes it hasn't saved. */
export function hasUnsavedChanges(): boolean {
  return dirtyGuards.size > 0;
}

/**
 * What has unsaved changes, for the dialog: "your About section", "your About
 * section and your intro", or "this page" when no form says.
 */
export function unsavedLabel(): string {
  const all = [...new Set(dirtyGuards.values())];
  if (all.length === 0) return 'this page';
  if (all.length === 1) return all[0]!;
  return `${all.slice(0, -1).join(', ')} and ${all.at(-1)}`;
}

/**
 * The user chose "Discard" for these edits: their browser prompt stands down
 * too, so a navigation Next turns into a full load (a missing route, say)
 * isn't stopped a second time. Forms on the next page guard as usual.
 */
export function discardUnsaved() {
  dirtyGuards.forEach((_label, key) => discarded.add(key));
  dirtyGuards.clear();
}

/**
 * The user chose to leave anyway (Logout confirmed): no browser prompt from
 * here on. Never undone: the page is about to be replaced.
 */
export function releaseLeaveGuards() {
  released = true;
}

/** `label` finishes "Your changes to …": "your About section", "this session type". */
export function useLeaveGuard(dirty: boolean, label = 'this page') {
  const id = useRef<symbol | null>(null);
  id.current ??= Symbol('leave-guard');
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    dirtyRef.current = dirty;
    const key = id.current!;
    if (dirty) dirtyGuards.set(key, label);
    else dirtyGuards.delete(key);
    return () => {
      dirtyGuards.delete(key);
      discarded.delete(key);
    };
  }, [dirty, label]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || released || discarded.has(id.current!)) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);
}

/**
 * The anchor an in-app link click would follow, or null when it isn't one to
 * hold: modified clicks, new tabs, downloads, other sites and same-page links
 * go through as usual.
 */
export function heldLink(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0) return null;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.('a[href]');
  if (!(a instanceof HTMLAnchorElement)) return null;
  if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
  const to = new URL(a.href, window.location.href);
  if (to.origin !== window.location.origin) return null;
  if (to.pathname === window.location.pathname && to.search === window.location.search) return null;
  return a;
}
