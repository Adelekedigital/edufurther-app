/*
 * The one link check (security review, PR #8), in plain JavaScript so the
 * service worker can run it unchanged: /sw.js puts this file's function into
 * the worker as it is (app/sw.js/route.ts), and the app imports it through
 * lib/utils/safeReturnTo. One implementation, no build step in between.
 * Plain script syntax only above the export line, which /sw.js drops.
 */
/** Control characters: the URL parser strips tabs/newlines, which can rebuild `//`. */
const CONTROL = /[\u0000-\u001F\u007F]/;
/** `.` / `..` path segments, raw or percent-encoded: normalising them can rebuild `//`. */
const DOT_SEGMENT = /(^|\/)(\.|%2e){1,2}(\/|\?|#|$)/i;
const BASE = 'https://edufurther.invalid';

/**
 * A post-sign-in destination, accepted only if it is a path on this site.
 * Anything else (absolute URLs, protocol-relative `//host`, backslash tricks,
 * dot segments, control characters, javascript:) falls back, so a crafted link
 * can't bounce a user off-site. The result is checked again *after* the URL
 * parser normalises it: `/.//evil.com` normalises to `//evil.com` (security
 * review, PR #8).
 */
function safeReturnTo(value, fallback = '/explore') {
  if (!value || value.length > 512) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (CONTROL.test(value) || DOT_SEGMENT.test(value)) return fallback;
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE) return fallback;
    const out = url.pathname + url.search + url.hash;
    if (!out.startsWith('/') || out.startsWith('//') || out.includes('\\')) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

export { safeReturnTo };
