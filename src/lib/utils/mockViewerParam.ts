/**
 * Dev and CI only (NEXT_PUBLIC_MOCK_VIEWER): the `?mockViewer=` override of
 * the mock viewer (lib/api/data/viewer). Kept apart from the viewer hook so a
 * redirect can carry it without importing the data layer.
 */

/** This page's `?mockViewer=`, on the client. */
export const readMockParam = (): string | null =>
  new URLSearchParams(window.location.search).get('mockViewer');

/**
 * `href` with this page's `?mockViewer=` kept (mock mode only), so a redirect
 * lands on the same mock viewer rather than the route's default.
 */
export function keepMockViewer(href: string): string {
  if (!process.env.NEXT_PUBLIC_MOCK_VIEWER || typeof window === 'undefined') return href;
  const mock = readMockParam();
  if (!mock) return href;
  return `${href}${href.includes('?') ? '&' : '?'}mockViewer=${encodeURIComponent(mock)}`;
}
