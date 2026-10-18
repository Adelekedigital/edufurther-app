'use client';

import { useCallback, useState } from 'react';

function read(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false; // storage blocked (private mode): just not remembered
  }
}

/**
 * A yes/no that lasts for this visit (the tab's session), e.g. "Hide for now".
 * It survives in-app navigation and comes back on the next visit.
 */
export function useSessionFlag(key: string): [boolean, () => void] {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && read(key));
  const set = useCallback(() => {
    setOn(true);
    try {
      window.sessionStorage.setItem(key, '1');
    } catch {
      // Not remembered past this page; it still hides now.
    }
  }, [key]);
  return [on, set];
}
