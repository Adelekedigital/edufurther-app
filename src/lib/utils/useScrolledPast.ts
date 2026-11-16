'use client';

import { useEffect, useState } from 'react';

/**
 * Whether `el` has scrolled up out of the viewport: passed, not yet reached.
 * False while it is in view, below the fold, or not on the page. Pass the
 * element through a callback ref (useState's setter) so a remount re-observes.
 */
export function useScrolledPast(el: Element | null): boolean {
  // Tagged with the element it was read for: a swapped or removed element
  // never inherits the last one's answer.
  const [seen, setSeen] = useState<{ el: Element; past: boolean } | null>(null);
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      const top = entry.rootBounds?.top ?? 0;
      setSeen({ el, past: !entry.isIntersecting && entry.boundingClientRect.bottom <= top });
    });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  return !!el && seen?.el === el && seen.past;
}
