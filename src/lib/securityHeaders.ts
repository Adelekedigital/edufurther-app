/**
 * Response headers on every route, applied by next.config.ts `headers()`.
 *
 * Referrer-Policy: `strict-origin-when-cross-origin` is what browsers do by
 * default, stated so it no longer depends on the default. Other sites (the
 * meeting host when Join opens a call) get our origin, never a path such as
 * /sessions/{id}. Not `no-referrer`: that also strips the origin, which
 * sign-in providers and services checking where a request came from may need.
 */
export const SECURITY_HEADERS = [
  {
    source: '/:path*',
    headers: [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }],
  },
];

/**
 * The service worker (public/sw.js, ADR 0011) is always revalidated, so a fix
 * to it reaches every device on its next visit. The offline page too: it is
 * precached at install, and a stale copy would outlive its own fix.
 */
export const PWA_HEADERS = [
  { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
  { source: '/offline.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
];
