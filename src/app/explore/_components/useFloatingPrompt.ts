'use client';

import { useEffect, useState } from 'react';

/** Phones with the bottom tab bar (signed-in mentees): bar height plus its gap. */
const MOBILE_BOTTOM_WITH_TABS = 72;
/** Phones without it (guests have no tab bar in AppShell). */
const MOBILE_BOTTOM_NO_TABS = 16;
const DESKTOP_BOTTOM = 24;
/** Right inset of the docked pill (matches MatchPill.module.css `.corner`). */
const DESKTOP_RIGHT = 24;
const MOBILE_RIGHT = 16;
/** Gap the design wants between "Show more mentors" and a pill beside it. */
const BESIDE_GAP = 16;
const MINI_SIZE = 48;
const FALLBACK_PILL_HEIGHT = 48;

export type FloatingPromptState = {
  /** The in-page prompt has scrolled up out of view. */
  passed: boolean;
  /** The pager ("Show more mentors") is coming into view. */
  nearEnd: boolean;
  isMobile: boolean;
  /** px the pill keeps from the bottom edge on phones. */
  mobileBottom: number;
  viewportWidth: number;
  /** px from the viewport bottom that puts a pill 12px above the pager. */
  lift: number;
  /** The pager has a "Show more mentors" button (not on the last page). */
  hasButton: boolean;
  /** The pager's button: its vertical centre (px from the viewport bottom) and right edge. */
  buttonCenter: number;
  buttonRight: number;
  /** The rendered full pill's size, for the "does it fit beside the button" check. */
  pillWidth: number;
  pillHeight: number;
};

const initial = (mobileBottom: number): FloatingPromptState => ({
  passed: false,
  nearEnd: false,
  isMobile: false,
  mobileBottom,
  viewportWidth: 0,
  lift: DESKTOP_BOTTOM,
  hasButton: false,
  buttonCenter: 0,
  buttonRight: 0,
  pillWidth: 0,
  pillHeight: FALLBACK_PILL_HEIGHT,
});

const same = (a: FloatingPromptState, b: FloatingPromptState) =>
  (Object.keys(a) as (keyof FloatingPromptState)[]).every((k) => a[k] === b[k]);

/**
 * Scroll state for the floating match pill (Design decisions: "Float behaviour,
 * final" and "Docked float lines up with the pager"). Reads the in-page prompt
 * (`[data-match-prompt]`), the pager (`[data-pager]`) and the pill itself
 * (`[data-match-pill]`) once per animation frame on scroll, resize, and whenever
 * the page's size changes — "Show more mentors" moves the pager without a scroll.
 */
export function useFloatingPrompt(enabled: boolean, hasTabBar: boolean): FloatingPromptState {
  const mobileBottom = hasTabBar ? MOBILE_BOTTOM_WITH_TABS : MOBILE_BOTTOM_NO_TABS;
  const [state, setState] = useState<FloatingPromptState>(() => initial(mobileBottom));

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let observedPill: HTMLElement | null = null;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        const prompt = document.querySelector('[data-match-prompt]');
        const pager = document.querySelector('[data-pager]');
        const button = pager?.querySelector('button');
        const pill = document.querySelector<HTMLElement>('[data-match-pill]');
        // The pill mounts after the first measurement that needs its size (and
        // changes size full ↔ mini); watch it so its size is read once it exists.
        if (pill && pill !== observedPill) {
          if (observedPill) resizeObserver.unobserve(observedPill);
          resizeObserver.observe(pill);
          observedPill = pill;
        }
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        const passed = !!prompt && prompt.getBoundingClientRect().bottom < 0;
        const pagerTop = pager ? pager.getBoundingClientRect().top : Infinity;
        const nearEnd = pagerTop < vh - (isMobile ? mobileBottom : DESKTOP_BOTTOM) + 8;
        const b = button?.getBoundingClientRect();
        const next: FloatingPromptState = {
          passed,
          nearEnd,
          isMobile,
          mobileBottom,
          viewportWidth: window.innerWidth,
          lift: nearEnd ? Math.max(DESKTOP_BOTTOM, Math.round(vh - pagerTop + 12)) : DESKTOP_BOTTOM,
          hasButton: !!b,
          buttonCenter: b ? Math.round(vh - (b.top + b.height / 2)) : 0,
          buttonRight: b ? Math.round(b.right) : 0,
          pillWidth: pill?.offsetWidth ?? 0,
          pillHeight: pill?.offsetHeight || FALLBACK_PILL_HEIGHT,
        };
        setState((s) => (same(s, next) ? s : next));
      });
    };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    window.addEventListener('resize', measure);
    measure();
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
    };
    // Re-run when `passed` flips: the pill mounts in that render, and the measure
    // that follows is the first one that can find it and read its size.
  }, [enabled, mobileBottom, state.passed]);

  return state;
}

/**
 * Where and how the pill draws. Near the pager a docked pill lines up with
 * "Show more mentors" (vertically centred, bottom-right) when it fits beside it
 * with a 16px gap; otherwise it sits 12px above the pager. Never below the tab bar.
 * `tracking` = it is following the pager, so its `bottom` must not animate.
 */
export function pillLayout(s: FloatingPromptState, minimised: boolean) {
  const mini = minimised || (s.nearEnd && s.isMobile);
  const dock: 'center' | 'corner' = mini || s.nearEnd ? 'corner' : 'center';
  const floor = s.isMobile ? s.mobileBottom : DESKTOP_BOTTOM;
  const withSafeArea = (px: number) =>
    s.isMobile ? `calc(${px}px + env(safe-area-inset-bottom))` : `${px}px`;

  if (!s.nearEnd) {
    return {
      size: mini ? 'mini' : 'full',
      dock,
      bottom: withSafeArea(floor),
      tracking: false,
    } as const;
  }

  const width = mini ? MINI_SIZE : s.pillWidth;
  const height = mini ? MINI_SIZE : s.pillHeight;
  const left = s.viewportWidth - (s.isMobile ? MOBILE_RIGHT : DESKTOP_RIGHT) - width;
  // Last page: no button to line up with, so always sit above the pager text.
  const fitsBeside = s.hasButton && width > 0 && left >= s.buttonRight + BESIDE_GAP;
  const target = fitsBeside ? Math.round(s.buttonCenter - height / 2) : s.lift;
  // The floor already includes the tab bar; the safe area only matters at the floor.
  const bottom = target <= floor ? withSafeArea(floor) : `${target}px`;
  return { size: mini ? 'mini' : 'full', dock, bottom, tracking: true } as const;
}
