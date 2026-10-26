'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * A yes/no remembered on this device for one account, until there's a server
 * flag for it (Mentee Home: "Getting started hidden", "invite link shared";
 * PRD open question 1). Keyed by the account's opaque id, never anything
 * personal. Storage can be missing or throw (a private window, blocked site
 * data): then the flag simply reads false and setting it lasts for the visit.
 */

const listeners = new Set<() => void>();
const memory = new Map<string, boolean>();

const keyFor = (flag: string, userId: string) => `ef-${flag}-${userId}`;

function read(key: string): boolean {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function write(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
    memory.delete(key);
  } catch {
    // Storage refused: kept in memory for this visit; nothing else depends on it.
    memory.set(key, on);
  }
  listeners.forEach((l) => l());
}

// Another tab's change arrives as a `storage` event: every flag re-reads.
const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener('storage', l);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', l);
  };
};

/** [on, set] for `flag` on this device for `userId`; false (and a no-op set) without an id. */
export function useDeviceFlag(
  flag: string,
  userId: string | null,
): [boolean, (on: boolean) => void] {
  const key = userId ? keyFor(flag, userId) : null;
  const on = useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : false),
    () => false,
  );
  const set = useCallback(
    (v: boolean) => {
      if (key) write(key, v);
    },
    [key],
  );
  return [on, set];
}
