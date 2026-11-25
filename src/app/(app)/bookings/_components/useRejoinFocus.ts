'use client';

import { useEffect, useRef, type FocusEvent } from 'react';
import { REJOIN_COPY } from '@/lib/copy/sessionLive';

/**
 * Keeps a keyboard user's place when the History Rejoin they are on goes at
 * its door's close, on the minute tick: focus moves to that row's Details and
 * the page says why, rather than dropping to <body> (GitHub review, PR 723).
 */
export function useRejoinFocus(shown: (id: string) => boolean, say: (text: string) => void) {
  const held = useRef<{ id: string; row: HTMLElement | null } | null>(null);
  // After every commit: the link has gone by the time this runs.
  useEffect(() => {
    const h = held.current;
    if (!h || shown(h.id)) return;
    held.current = null;
    // Only when focus fell with the link: someone who moved on keeps their place.
    if (document.activeElement && document.activeElement !== document.body) return;
    // Details is the row's first button: before the action rail in the DOM.
    h.row?.querySelector<HTMLElement>('button')?.focus();
    say(REJOIN_COPY.closed);
  });
  return {
    onFocus: (id: string) => (e: FocusEvent<HTMLElement>) => {
      // The link sits in the row's action rail: rail, then row.
      held.current = { id, row: e.currentTarget.parentElement?.parentElement ?? null };
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      const el = e.currentTarget;
      // A blur from the link being removed is not the user leaving it.
      queueMicrotask(() => {
        if (el.isConnected) held.current = null;
      });
    },
  };
}
