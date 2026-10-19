'use client';

import { useCallback, useState } from 'react';

/**
 * The form rule for multi-field forms (Settings handoff.md, 19 Oct): Save is
 * never disabled. Saving with gaps shows "Fill in the required fields to
 * continue.", an error on each missing field, and focuses the first. Errors
 * then follow the fields as they're fixed, and reset on Discard or Cancel.
 *
 * `gaps` is what is missing right now, in the form's order. Each field marks
 * the element to focus with `data-ff="<gap>"`.
 */
export function useRequiredFields<K extends string>(gaps: readonly K[]) {
  const [tried, setTried] = useState(false);
  const shown = tried ? gaps : [];

  /** True when nothing is missing; otherwise shows the errors and focuses the first gap. */
  const check = (): boolean => {
    if (gaps.length === 0) {
      setTried(false);
      return true;
    }
    setTried(true);
    focusGap(gaps[0]!);
    return false;
  };

  const reset = useCallback(() => setTried(false), []);

  return {
    /** The missing fields to mark, once Save was tried. */
    errors: shown,
    has: (k: K) => shown.includes(k),
    /** The line by the Save button. */
    formError: shown.length > 0,
    check,
    reset,
  };
}

/**
 * After the errors render, and after any dialog that asked (Save and continue)
 * has closed and handed focus back to its opener: the field into view (clear
 * of a sticky header) and focused. Waits a few frames at most.
 */
function focusGap(gap: string, frames = 30) {
  requestAnimationFrame(() => {
    const dialogOpen = document.querySelector('[role="dialog"], [role="alertdialog"]');
    if (dialogOpen && frames > 0) return focusGap(gap, frames - 1);
    const el = document.querySelector<HTMLElement>(`[data-ff="${CSS.escape(gap)}"]`);
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    window.scrollBy({ top: top - 120, behavior: 'smooth' });
    el.focus({ preventScroll: true });
  });
}
