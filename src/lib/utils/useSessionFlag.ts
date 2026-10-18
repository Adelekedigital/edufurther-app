'use client';

import { useCallback, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

// Set when storage can't hold it, so it still hides for the life of the page.
const inMemory = new Set<string>();

function read(key: string): boolean {
  if (inMemory.has(key)) return true;
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false; // storage blocked (private mode): just not remembered
  }
}

/**
 * A yes/no that lasts for this visit (the tab's session), e.g. "Hide for now".
 * It survives in-app navigation and comes back on the next visit. The server
 * snapshot is false, so hydration never disagrees.
 */
export function useSessionFlag(key: string): [boolean, () => void] {
  const on = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );
  const set = useCallback(() => {
    try {
      window.sessionStorage.setItem(key, '1');
    } catch {
      inMemory.add(key);
    }
    listeners.forEach((l) => l());
  }, [key]);
  return [on, set];
}

/** Tests only: forget the in-memory fallbacks. */
export function resetSessionFlags() {
  inMemory.clear();
}
