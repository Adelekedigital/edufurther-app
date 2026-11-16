'use client';

import { useEffect, useState } from 'react';

/**
 * Whether `el` has scrolled up out of the viewport: passed, not yet reached.
 * False while it is in view, below the fold, or not on the page. Pass the
 * element through a callback ref (useState's setter) so a remount re-observes.
 * `topInset` (px, read when observing starts) is what covers the viewport's
 * top, e.g. a sticky header: "past" means under its bottom edge. Pass a
 * stable function (module level): a new one re-observes.
 */
export function useScrolledPast(el: Element | null, topInset?: () => number): boolean {
  // Tagged with the element it was read for: a swapped or removed element
  // never inherits the last one's answer.
  const [seen, setSeen] = useState<{ el: Element; past: boolean } | null>(null);
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const inset = Math.max(0, Math.round(topInset?.() ?? 0));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const top = entry.rootBounds?.top ?? inset;
        setSeen({ el, past: !entry.isIntersecting && entry.boundingClientRect.bottom <= top });
      },
      { rootMargin: `-${inset}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el, topInset]);
  return !!el && seen?.el === el && seen.past;
}
