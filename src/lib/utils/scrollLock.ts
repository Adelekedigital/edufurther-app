/**
 * The page's scroll lock, shared by every dialog and sheet. Counted: only the
 * first lock takes it and only the last release gives it back, so a dialog
 * closing over a sheet doesn't unlock the page under the sheet.
 *
 * Hiding the scrollbar widens the page by its width (15px on Windows), which
 * shifted everything sideways as a dialog opened. The body is padded by that
 * width instead, so nothing moves and the scrim still covers the whole window
 * (`scrollbar-gutter: stable` keeps the gap but leaves it unscrimmed).
 */
let locks = 0;
let before: { overflow: string; paddingRight: string } | null = null;

/** Locks page scroll; returns the release, safe to call more than once. */
export function lockScroll(): () => void {
  const body = document.body;
  if (locks++ === 0) {
    // No layout (jsdom reports 0): no gap to make up.
    const wide = document.documentElement.clientWidth;
    const gap = wide > 0 ? window.innerWidth - wide : 0;
    before = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    if (gap > 0) {
      const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${padding + gap}px`;
      // Fixed elements aren't padded: they add this (--fixed-center-x, --fixed-edge-gap).
      document.documentElement.style.setProperty('--scroll-lock-gap', `${gap}px`);
    }
    body.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks > 0 || !before) return;
    body.style.overflow = before.overflow;
    body.style.paddingRight = before.paddingRight;
    document.documentElement.style.removeProperty('--scroll-lock-gap');
    before = null;
  };
}
