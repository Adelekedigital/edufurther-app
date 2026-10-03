'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Everything a dialog may send focus to. Kept here so every dialog agrees on
 * what counts as focusable.
 */
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * WAI-ARIA dialog behaviour, in one place: move focus in, keep Tab inside,
 * close on Escape, lock page scroll, and put focus back where it came from.
 *
 * Extracted from ModalShell so the Bookings detail sheet cannot drift from it.
 * A dialog whose Escape works in one corner of the app and not another is the
 * failure this exists to prevent, and the details below are each a bug someone
 * already hit — so call this rather than writing it again.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  // Read through a ref so a new `onClose` each render doesn't rebind the
  // listener — rebinding would re-run the whole effect, including the focus move.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      // Read the ref on every key: a caller may swap the element when the
      // viewport crosses a breakpoint (ModalShell's sheet and centred modal).
      const live = ref.current;
      if (e.key !== 'Tab' || !live) return;
      const items = Array.from(live.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        // Skip what is hidden, but never drop the element that has focus.
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (!live.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? lastEl : firstEl).focus();
      } else if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // The value it had, not '': something else may have locked it too.
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
    // Once per mount, on purpose: re-running would steal focus mid-dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
