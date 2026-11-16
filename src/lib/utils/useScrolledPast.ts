'use client';

import { useEffect, useState } from 'react';

/** How far down the viewport an element reaches, in whole px (0 for none). */
const bottomOf = (cover: Element | null) =>
  cover ? Math.max(0, Math.round(cover.getBoundingClientRect().bottom)) : 0;

/**
 * Whether `el` has scrolled up out of the viewport: passed, not yet reached.
 * False while it is in view, below the fold, or not on the page. Pass the
 * element through a callback ref (useState's setter) so a remount re-observes.
 * `cover` finds what covers the viewport's top (a sticky header): "past" means
 * under its bottom edge, re-measured whenever it or the window resizes. Pass a
 * stable function (module level): a new one re-observes.
 */
export function useScrolledPast(el: Element | null, cover?: () => Element | null): boolean {
  // Tagged with the element it was read for: a swapped or removed element
  // never inherits the last one's answer.
  const [seen, setSeen] = useState<{ el: Element; past: boolean } | null>(null);
  // The cover's bottom edge once watched; until then it is read when observing starts.
  const [inset, setInset] = useState<number | null>(null);

  useEffect(() => {
    const c = el && cover ? cover() : null;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const measure = () => setInset(bottomOf(c));
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [el, cover]);

  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const top = inset ?? bottomOf(cover?.() ?? null);
    // The root shrinks by the cover, so leaving it upward means going under it.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const rootTop = entry.rootBounds?.top ?? top;
        setSeen({ el, past: !entry.isIntersecting && entry.boundingClientRect.bottom <= rootTop });
      },
      { rootMargin: `-${top}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el, cover, inset]);

  return !!el && seen?.el === el && seen.past;
}
