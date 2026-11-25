'use client';

import { useEffect, useRef, type FocusEvent } from 'react';
import { REJOIN_COPY } from '@/lib/copy/rejoin';

type Held = { id: string; row: HTMLElement | null; tab: string | null };

/**
 * Keeps a keyboard user's place when the History Rejoin they are on goes at
 * its door's close, on the minute tick, and says why, rather than dropping
 * focus to <body> (GitHub review, PR 723). Focus goes to that row's Details;
 * when the whole row went (an unsettled one leaves with its door), to the
 * History tab.
 */
export function useRejoinFocus(shown: (id: string) => boolean, say: (text: string) => void) {
  const held = useRef<Held | null>(null);
  // After every commit: the link has gone by the time this runs.
  useEffect(() => {
    const h = held.current;
    if (!h || shown(h.id)) return;
    held.current = null;
    // Only when focus fell with the link: someone who moved on keeps their place.
    if (document.activeElement && document.activeElement !== document.body) return;
    // Details is the row's first button: before the action rail in the DOM.
    const details = h.row?.isConnected ? h.row.querySelector<HTMLElement>('button') : null;
    (details ?? (h.tab ? document.getElementById(h.tab) : null))?.focus();
    say(REJOIN_COPY.closed);
  });
  return {
    onFocus: (id: string) => (e: FocusEvent<HTMLElement>) => {
      const el = e.currentTarget;
      // The link sits in the row's action rail: rail, then row. The panel's
      // tab is `${panel id}-tab` (TabPanel).
      const panel = el.closest('[role="tabpanel"]');
      held.current = {
        id,
        row: el.parentElement?.parentElement ?? null,
        tab: panel?.id ? `${panel.id}-tab` : null,
      };
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
