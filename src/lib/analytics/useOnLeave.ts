'use client';

import { useEffect, useRef } from 'react';
import { useLatest } from '@/lib/utils/useLatest';

/**
 * Runs `onLeave` once, when the component really goes: unmounted (closed,
 * navigated away in the app) or the page hidden (tab closed, a full
 * navigation). A page restored from the back/forward cache can leave again. For a funnel's `_abandoned` event: `onLeave` reads the latest
 * render and decides whether there is anything to send.
 *
 * React StrictMode (dev) unmounts and remounts every effect once: the unmount
 * is only acted on after a microtask, and a remount in between cancels it, so
 * a dev build sends no phantom abandon.
 */
export function useOnLeave(onLeave: () => void) {
  const latest = useLatest(onLeave);
  // How many times the effect has run, and whether the leave was already sent.
  const state = useRef({ generation: 0, left: false });

  useEffect(() => {
    const st = state.current;
    const mine = ++st.generation;
    const leave = () => {
      if (st.left) return;
      st.left = true;
      latest.current();
    };
    // Back from the back/forward cache: the page (and this component) lives
    // again, so leaving it later counts.
    const back = (e: PageTransitionEvent) => {
      if (e.persisted) st.left = false;
    };
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', back);
    return () => {
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', back);
      // A remount before this runs (StrictMode) bumped the count: not a leave.
      queueMicrotask(() => {
        if (st.generation === mine) leave();
      });
    };
  }, [latest]);
}
