'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { toastHasFocus } from './Snackbar';

/** How long an outcome toast stays: 5 seconds. */
export const TOAST_MS = 5000;

/**
 * A toast that goes by itself after `ms`, but never from under focus: while
 * someone is on it (keyboard, screen reader), it waits until they leave.
 * Every screen with a timed Snackbar uses this, so none times out differently.
 * Setting a new toast restarts the time.
 */
export function useTimedToast<T>(ms = TOAST_MS): [T | null, Dispatch<SetStateAction<T | null>>] {
  const [toast, setToast] = useState<T | null>(null);
  useEffect(() => {
    if (toast === null) return;
    let t: ReturnType<typeof setTimeout>;
    const dismiss = () => {
      if (toastHasFocus()) {
        t = setTimeout(dismiss, ms);
        return;
      }
      setToast(null);
    };
    t = setTimeout(dismiss, ms);
    return () => clearTimeout(t);
  }, [toast, ms]);
  return [toast, setToast];
}
