import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

// useLayoutEffect measures before paint (no flip flicker); fall back to
// useEffect on the server so SSR doesn't warn.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * For a popover drawn from its trigger's right edge (tooltip, menu): true when,
 * once open, it would cross the left of the viewport, so the caller draws it
 * from the left edge instead. Measured before paint; resets on close.
 */
export function useEdgeFlip(open: boolean, ref: RefObject<HTMLElement | null>, margin = 4) {
  const [flipped, setFlipped] = useState(false);
  useIsoLayoutEffect(() => {
    if (!open) {
      setFlipped(false);
      return;
    }
    const r = ref.current?.getBoundingClientRect();
    if (r && r.left < margin) setFlipped(true);
  }, [open]);
  return flipped;
}

/**
 * For a popover hung from its trigger (a menu): how far to slide it sideways,
 * in px, so it stays `margin` inside the viewport while staying as close to the
 * trigger as it can. 0 when it already fits. Measured before paint; resets on
 * close.
 */
export function useClampIntoView(open: boolean, ref: RefObject<HTMLElement | null>, margin = 16) {
  const [shift, setShift] = useState(0);
  useIsoLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const vw = document.documentElement.clientWidth;
    if (r.left < margin) setShift(margin - r.left);
    else if (r.right > vw - margin) setShift(vw - margin - r.right);
  }, [open]);
  return shift;
}
