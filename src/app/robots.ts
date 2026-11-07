import type { MetadataRoute } from 'next';

/**
 * Crawlers cost what a visit costs (owner's Vercel cost rules, 2026-11-07).
 * Closed unless SITE_INDEXABLE=true, so dev and staging stay out of search;
 * the production project opts in. Open, only the public pages: home, Explore
 * and mentor profiles. Everything else is signed-in or the API.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_INDEXABLE !== 'true') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: ['/$', '/explore', '/mentors/'], disallow: '/' },
  };
}
