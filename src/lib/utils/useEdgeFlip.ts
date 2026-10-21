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
