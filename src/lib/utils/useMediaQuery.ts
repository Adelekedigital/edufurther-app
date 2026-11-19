'use client';

import { useSyncExternalStore } from 'react';

/** A phone: the app's 768px breakpoint, and a touch screen (a narrow desktop window isn't one). */
export const PHONE_QUERY = '(max-width: 767px) and (pointer: coarse)';

/** Live `matchMedia` result. The server render assumes `false`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
