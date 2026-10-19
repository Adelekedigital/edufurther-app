'use client';

import { useEffect, useRef } from 'react';

/**
 * Unsaved-changes guards, app-wide (product, 2026-10-01). A form with edits it
 * hasn't saved calls `useLeaveGuard(dirty, 'your About section')`. Then:
 * - an in-app link (sidebar, tabs, cards): AppShell asks "Discard your
 *   changes?" (Keep editing / Discard) before following it;
 * - Logout: the same question, before the session ends;
 * - reload, close, a typed address: the browser's own "Leave site?" prompt
 *   (browsers allow no custom dialog there).
 * Not caught: the browser's Back/Forward (#132), and in-page controls that
 * close a form without a link, like profile tabs (#134); those screens ask
 * through `hasUnsavedChanges` / `discardUnsaved` themselves.
 *
 * A form that can save itself (Settings, Mentee Settings.dc.html `leaveGuard`
 * confirm, owner 2026-10-19) passes `onSave`: the dialog then asks "Save your
 * changes?" with Save and continue as a third choice.
 */
/** Saves the form; resolves false when it couldn't (gaps shown, or the write failed). */
export type LeaveSave = () => Promise<boolean>;

type Guard = { label: string; save: { current: LeaveSave | undefined } };
const dirtyGuards = new Map<symbol, Guard>();
/** Forms whose edits the user chose to discard; they count again once edited. */
const discarded = new Set<symbol>();
let released = false;

const live = () => [...dirtyGuards.entries()].filter(([key]) => !discarded.has(key));

/**
 * The one form with unsaved changes, when it can save itself; else null (none,
 * several, or one without `onSave`): those get "Discard your changes?".
 */
export function unsavedSave(): LeaveSave | null {
  if (released) return null;
  const all = live();
  if (all.length !== 1) return null;
  const save = all[0]![1].save.current;
  return save ?? null;
}

/** True while any mounted form has changes it hasn't saved (and that weren't discarded). */
export function hasUnsavedChanges(): boolean {
  return !released && live().length > 0;
}

/**
 * What has unsaved changes, for the dialog: "your About section", "your About
 * section and your intro", or "this page" when no form says.
 */
export function unsavedLabel(): string {
  const all = [...new Set(live().map(([, g]) => g.label))];
  if (all.length === 0) return 'this page';
  if (all.length === 1) return all[0]!;
  return `${all.slice(0, -1).join(', ')} and ${all.at(-1)}`;
}

/**
 * The user chose "Discard": the forms dirty right now stop counting, browser
 * prompt included, so a navigation Next turns into a full load (a missing
 * route, say) isn't stopped a second time. Only those forms, and only until
 * they're edited again: any other form, on this page or the next, guards as
 * usual, and a page still there after a cancelled navigation guards again on
 * the next edit (typing, a select, or a click on anything but a link: chips,
 * switches and segmented controls are buttons).
 */
export function discardUnsaved() {
  dirtyGuards.forEach((_guard, key) => discarded.add(key));
  const rearm = (e: Event) => {
    if (e.type === 'click' && (e.target as Element | null)?.closest?.('a[href]')) return;
    discarded.clear();
    REARM_EVENTS.forEach((t) => document.removeEventListener(t, rearm, true));
  };
  REARM_EVENTS.forEach((t) => document.addEventListener(t, rearm, true));
}
const REARM_EVENTS = ['input', 'change', 'click'] as const;

/**
 * The user chose to leave anyway (Logout confirmed): no browser prompt from
 * here on. Never undone: the page is about to be replaced.
 */
export function releaseLeaveGuards() {
  released = true;
}

/**
 * `label` finishes "Your changes to …": "your About section", "this session
 * type". With `onSave` it names the place instead ("Your changes on Profile").
 */
export function useLeaveGuard(dirty: boolean, label = 'this page', onSave?: LeaveSave) {
  const id = useRef<symbol | null>(null);
  id.current ??= Symbol('leave-guard');
  const dirtyRef = useRef(dirty);
  // The latest save, read when the dialog asks: a new closure each render
  // must not re-register the guard.
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  });

  useEffect(() => {
    dirtyRef.current = dirty;
    const key = id.current!;
    if (dirty) dirtyGuards.set(key, { label, save });
    else dirtyGuards.delete(key);
    return () => {
      // A change of state (clean, or dirty again) or unmounting starts fresh.
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
