'use client';

import { useSyncExternalStore } from 'react';
import { onSessionChange, type SessionState } from '@/lib/vendor/supabase/browser';

/**
 * The Supabase session as a React store. `unknown` until the SDK reports the
 * stored session (first client render), so nothing flashes guest chrome at a
 * signed-in visitor.
 */
export type Session = { status: 'unknown' } | SessionState;

let current: Session = { status: 'unknown' };
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  stop ??= onSessionChange((s) => {
    const same =
      current.status === s.status &&
      (s.status !== 'present' || (current.status === 'present' && current.userId === s.userId));
    if (same) return;
    current = s;
    listeners.forEach((l) => l());
  });
  return () => {
    listeners.delete(listener);
  };
}

const UNKNOWN: Session = { status: 'unknown' };

export function useSession(): Session {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => UNKNOWN,
  );
}

/** Cache-key identity: responses differ per viewer (goal ordering, self-exclusion). */
export function sessionKey(s: Session): string {
  return s.status === 'present' ? s.userId : s.status;
}
