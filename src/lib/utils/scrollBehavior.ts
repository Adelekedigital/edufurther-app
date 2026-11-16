/**
 * How a scroll the page starts should move: 'smooth', or 'auto' (a jump)
 * under prefers-reduced-motion. Read at the moment of the scroll.
 */
export function scrollBehavior(): ScrollBehavior {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  return reduce ? 'auto' : 'smooth';
}
