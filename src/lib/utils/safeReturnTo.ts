/**
 * A post-sign-in destination, accepted only if it is a path on this site;
 * anything else falls back (absolute URLs, `//host`, backslash tricks, dot
 * segments, control characters, javascript:). The check lives in
 * lib/pwa/safePath.js, plain JavaScript, so the service worker runs the very
 * same function on a notification's link.
 */
export { safeReturnTo } from '@/lib/pwa/safePath';
