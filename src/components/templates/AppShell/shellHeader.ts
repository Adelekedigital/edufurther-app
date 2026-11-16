/**
 * The sticky app header (AppShell's data-shell-header), or null without one.
 * What scrolls "out of view" goes under it, not off the screen's top; its
 * height can change (the offline bar inside it), so callers watch it.
 */
export function shellHeader(): Element | null {
  return document.querySelector('[data-shell-header]');
}
