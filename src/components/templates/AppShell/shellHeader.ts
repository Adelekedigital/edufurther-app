/**
 * How far down the viewport the sticky app header reaches, in px (its bottom
 * edge: the preview bar and safe area included), or 0 without one. Read when
 * asked: what scrolls "out of view" goes under it, not off the screen top.
 */
export function shellHeaderBottom(): number {
  const header = document.querySelector('[data-shell-header]');
  return header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
}
