'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/**
 * Whether the page is on screen (`document.visibilityState`). A message counts
 * as read only while its chat is open and visible (PRD "Updating"), so a
 * background tab never marks anything read. False on the server.
 */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === 'visible',
    () => false,
  );
}
