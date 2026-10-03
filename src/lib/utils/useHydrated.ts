'use client';

import { useSyncExternalStore } from 'react';

const never = () => () => {};

/**
 * False on the server and for the first paint, true once the client is running.
 *
 * For anything that depends on something the server cannot know — a media
 * query, `window` — so it renders nothing rather than guessing and then
 * swapping. `useSyncExternalStore`'s two snapshots say exactly that, without a
 * state write in an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    never,
    () => true,
    () => false,
  );
}
