/**
 * A post-sign-in destination, accepted only if it is a path on this site.
 * Anything else (absolute URLs, protocol-relative `//host`, backslash tricks,
 * javascript:) falls back, so a crafted link can't bounce a user off-site.
 */
export function safeReturnTo(value: string | null | undefined, fallback = '/explore'): string {
  if (!value || value.length > 512) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    // Resolve against a dummy origin: anything that escapes it is not a local path.
    const url = new URL(value, 'https://edufurther.invalid');
    if (url.origin !== 'https://edufurther.invalid') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
