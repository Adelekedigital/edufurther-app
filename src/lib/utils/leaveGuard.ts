'use client';

import { useEffect, useRef } from 'react';

/**
 * Unsaved-changes guards, app-wide. A form calls `useLeaveGuard(dirty)`:
 * - reload / close / a full navigation get the browser's own "Leave site?"
 *   prompt while it's dirty;
 * - Logout asks first (`hasUnsavedChanges`), because by the time the browser
 *   prompts, the session has already ended (review of PR 127).
 */
const dirtyGuards = new Set<symbol>();
let released = false;

/** True while any mounted form has changes it hasn't saved. */
export function hasUnsavedChanges(): boolean {
  return dirtyGuards.size > 0;
}

/**
 * The user chose to leave anyway (Logout confirmed): no browser prompt from
 * here on. Never undone: the page is about to be replaced.
 */
export function releaseLeaveGuards() {
  released = true;
}

export function useLeaveGuard(dirty: boolean) {
  const id = useRef<symbol | null>(null);
  id.current ??= Symbol('leave-guard');
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    dirtyRef.current = dirty;
    const key = id.current!;
    if (dirty) dirtyGuards.add(key);
    else dirtyGuards.delete(key);
    return () => {
      dirtyGuards.delete(key);
    };
  }, [dirty]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || released) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);
}
