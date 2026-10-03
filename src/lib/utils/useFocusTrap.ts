'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Everything a dialog may send focus to. Kept here so every dialog agrees on
 * what counts as focusable.
 */
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Every open dialog. Module-level on purpose: dialogs do not know about each
 * other, but Escape and the scroll lock are global, so something has to.
 *
 * Which one is innermost is decided by **document order**, not by the order
 * they mounted: React runs a child's effect before its parent's, so a sheet and
 * a modal that open in the same commit register inside-out. Document order gets
 * both cases right — a dialog nested inside another comes after it, and of two
 * portalled siblings the one appended later is on top.
 */
const traps: RefObject<HTMLElement | null>[] = [];
/** What `body` overflow was before the outermost dialog locked it. */
let overflowBeforeLock: string | null = null;

/**
 * WAI-ARIA dialog behaviour, in one place: move focus in, keep Tab inside,
 * close on Escape, lock page scroll, and put focus back where it came from.
 *
 * Extracted from ModalShell so the Bookings detail sheet cannot drift from it.
 * A dialog whose Escape works in one corner of the app and not another is the
 * failure this exists to prevent, and the details below are each a bug someone
 * already hit — so call this rather than writing it again.
 *
 * **Dialogs stack.** Below 1100px the Bookings details panel is itself a
 * dialog, and the intake-file viewer opens on top of it. Every trap listens on
 * `document`, so without a stack one Escape would run both handlers: the
 * viewer closes and the panel closes with it, dropping `?booking=` and losing
 * the user's place to a keystroke that should have dismissed a preview. Only
 * the innermost dialog responds to a key, and the scroll lock is counted so the
 * inner one closing does not unlock the page underneath the outer one.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  // Read through a ref so a new `onClose` each render doesn't rebind the
  // listener — rebinding would re-run the whole effect, including the focus move.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    traps.push(ref);
    const innermost = () =>
      traps
        .filter((t) => t.current?.isConnected)
        .reduce<RefObject<HTMLElement | null> | null>(
          (deepest, t) =>
            !deepest ||
            deepest.current!.compareDocumentPosition(t.current!) &
              Node.DOCUMENT_POSITION_FOLLOWING
              ? t
              : deepest,
          null,
        ) === ref;

    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog)?.focus();

    // Only the outermost dialog takes the lock, and only it gives it back.
    if (traps.length === 1) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const onKey = (e: KeyboardEvent) => {
      // A dialog with another one open on top of it is inert.
      if (!innermost()) return;
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
      const at = traps.indexOf(ref);
      if (at >= 0) traps.splice(at, 1);
      // Only when the last dialog goes, and to the value it had rather than
      // '': something else may have locked it too.
      if (traps.length === 0) {
        document.body.style.overflow = overflowBeforeLock ?? '';
        overflowBeforeLock = null;
      }
      opener?.focus?.();
    };
    // Once per mount, on purpose: re-running would steal focus mid-dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
