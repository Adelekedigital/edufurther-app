'use client';

import { useCallback, useState } from 'react';

/** The design's `pageSize`: how many rows a list shows, and reveals, at a time. */
export const PAGE_SIZE = 5;

/**
 * How much of a list is on screen. Rows are revealed rather than paged, so
 * nothing a reader was looking at moves or disappears when more arrives.
 *
 * `reset` is for a filter change: the old count would otherwise carry over to a
 * shorter list and leave the button saying there is more when there is not.
 */
export function useRevealed(step = PAGE_SIZE) {
  const [shown, setShown] = useState(step);
  const showMore = useCallback(() => setShown((n) => n + step), [step]);
  const reset = useCallback(() => setShown(step), [step]);
  return { shown, showMore, reset };
}
