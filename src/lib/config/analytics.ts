/**
 * Product analytics (PRD 30), two flags, both off by default (owner,
 * 2026-11-10):
 * - NEXT_PUBLIC_ANALYTICS_ENABLED: client tracking on, cookieless only.
 * - NEXT_PUBLIC_CONSENT_BANNER_ENABLED: the banner and the Settings switch;
 *   only after Accept does tracking go identified, with replay. It does
 *   nothing while analytics is off. Stays off until legal approves the copy.
 * NEXT_PUBLIC_POSTHOG_KEY is the public project key (it only names the
 * project); without it the SDK never loads, whatever the flags say.
 */
export const ANALYTICS_LIVE = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
export const CONSENT_BANNER_LIVE =
  ANALYTICS_LIVE && process.env.NEXT_PUBLIC_CONSENT_BANNER_ENABLED === 'true';
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? '';

/** The same-origin path next.config.ts forwards to PostHog (never the vendor's own host). */
export const ANALYTICS_PATH = '/ingest';
