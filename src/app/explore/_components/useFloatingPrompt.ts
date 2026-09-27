'use client';

import { useEffect, useState } from 'react';

/** Bottom tab bar height on phones (AppShell) plus its gap. */
const MOBILE_BOTTOM = 72;
const DESKTOP_BOTTOM = 24;

export type FloatingPromptState = {
  /** The in-page prompt has scrolled up out of view. */
  passed: boolean;
  /** The pager ("Show more mentors") is coming into view. */
  nearEnd: boolean;
  /** Desktop only: px from the bottom so a docked pill sits 12px above the pager. */
  lift: number;
  isMobile: boolean;
};

/**
 * Scroll state for the floating match pill (Design decisions, "Float behaviour,
 * final"). Reads the in-page prompt (`[data-match-prompt]`) and the pager
 * (`[data-pager]`) once per animation frame on scroll and resize.
 */
export function useFloatingPrompt(enabled: boolean): FloatingPromptState {
  const [state, setState] = useState<FloatingPromptState>({
    passed: false,
    nearEnd: false,
    lift: DESKTOP_BOTTOM,
    isMobile: false,
  });

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const prompt = document.querySelector('[data-match-prompt]');
        const pager = document.querySelector('[data-pager]');
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        const passed = !!prompt && prompt.getBoundingClientRect().bottom < 0;
        const limit = window.innerHeight - (isMobile ? MOBILE_BOTTOM : DESKTOP_BOTTOM) + 8;
        const pagerTop = pager ? pager.getBoundingClientRect().top : Infinity;
        const nearEnd = pagerTop < limit;
        const lift = nearEnd
          ? Math.max(DESKTOP_BOTTOM, Math.round(window.innerHeight - pagerTop + 12))
          : DESKTOP_BOTTOM;
        setState((s) =>
          s.passed === passed && s.nearEnd === nearEnd && s.lift === lift && s.isMobile === isMobile
            ? s
            : { passed, nearEnd, lift, isMobile },
        );
      });
    };
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);

  return state;
}

/** Where and how the pill draws, from scroll state and the × choice. */
export function pillLayout(s: FloatingPromptState, minimised: boolean) {
  const mini = minimised || (s.nearEnd && s.isMobile);
  const dock: 'center' | 'corner' = mini || s.nearEnd ? 'corner' : 'center';
  const bottom = s.isMobile
    ? `calc(${MOBILE_BOTTOM}px + env(safe-area-inset-bottom))`
    : !mini && s.nearEnd
      ? `${s.lift}px`
      : `${DESKTOP_BOTTOM}px`;
  return { size: mini ? ('mini' as const) : ('full' as const), dock, bottom };
}
