'use client';

import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { onSessionChange, type SessionState } from '@/lib/vendor/supabase/browser';

/**
 * The Supabase session as a React store. Until the SDK reports the stored
 * session it is the server's hint (the proxy verified the cookie), so the
 * first render already has the right chrome; with no hint it is `unknown`, so
 * nothing flashes guest chrome at a signed-in visitor.
 */
export type Session = { status: 'unknown' } | SessionState;

let current: Session = { status: 'unknown' };
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;
let leaving = false;

/**
 * Logout has begun: from here the store ignores the SDK, so the SIGNED_OUT it
 * fires doesn't redraw the screen as a guest before /login replaces the page.
 * Never undone: the page is about to be thrown away.
 */
export function beginSignOut() {
  leaving = true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  stop ??= onSessionChange((s) => {
    if (leaving) return;
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

const HintContext = createContext<SessionState | null>(null);

/** The server's answer to "who is signed in?" for the first render (root layout). */
export function SessionHintProvider({
  hint,
  children,
}: {
  hint: SessionState | null;
  children: ReactNode;
}) {
  const status = hint?.status ?? null;
  const userId = hint?.status === 'present' ? hint.userId : null;
  const value = useMemo<SessionState | null>(
    () =>
      status === 'present' && userId
        ? { status: 'present', userId }
        : status === 'none'
          ? { status: 'none' }
          : null,
    [status, userId],
  );
  return createElement(HintContext.Provider, { value }, children);
}

export function useSession(): Session {
  const before: Session = useContext(HintContext) ?? UNKNOWN;
  return useSyncExternalStore(
    subscribe,
    // The SDK's report wins as soon as there is one.
    () => (current.status === 'unknown' ? before : current),
    () => before,
  );
}

/** Cache-key identity: responses differ per viewer (goal ordering, self-exclusion). */
export function sessionKey(s: Session): string {
  return s.status === 'present' ? s.userId : s.status;
}
