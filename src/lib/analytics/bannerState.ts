'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether the consent banner is up (AnalyticsRoot sets it), so another ask on
 * the page, the What's new tour, waits for an answer rather than covering it.
 */
let shown = false;
const listeners = new Set<() => void>();

export function setConsentBannerShown(on: boolean): void {
  if (on === shown) return;
  shown = on;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useConsentBannerShown(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => shown,
    () => false,
  );
}
