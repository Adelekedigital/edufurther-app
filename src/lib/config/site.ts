/**
 * The site's own address, for absolute links in metadata (og:image, og:url).
 * Set per environment (SITE_URL: staging.edufurther.org on the development
 * branch, the production address on Production). Without it Next falls back to
 * Vercel's own URLs: on Production that is the shortest custom domain, which
 * was app.edufurther.org while it still served the legacy app, so every
 * preview card image would have pointed there (owner, 2026-11-14).
 */
export function siteBase(raw: string | undefined = process.env.SITE_URL): URL | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : undefined;
  } catch {
    return undefined;
  }
}
