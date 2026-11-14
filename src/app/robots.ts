import type { MetadataRoute } from 'next';

/**
 * Link-preview bots fetch a shared page once, to draw its card in a chat or a
 * post. LinkedIn's (and others') obey robots.txt, so a closed file meant no
 * card on staging, and none for invites anywhere (owner, 2026-11-14). They may
 * read only the pages people share, in every environment.
 */
const PREVIEW_BOTS = [
  'LinkedInBot',
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
];

/** The shared pages; their card images (opengraph-image) sit under them. */
const SHARED_PAGES = ['/mentors/', '/invite/', '/og/'];

/**
 * Crawlers cost what a visit costs (owner's Vercel cost rules, 2026-11-07).
 * Search is closed unless SITE_INDEXABLE=true, so dev and staging stay out of
 * it; the production project opts in. Open, only the public pages: home,
 * Explore and mentor profiles. Everything else is signed-in or the API.
 */
export default function robots(): MetadataRoute.Robots {
  const previews = { userAgent: PREVIEW_BOTS, allow: SHARED_PAGES, disallow: '/' };
  if (process.env.SITE_INDEXABLE !== 'true') {
    return { rules: [previews, { userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [previews, { userAgent: '*', allow: ['/$', '/explore', '/mentors/'], disallow: '/' }],
  };
}
