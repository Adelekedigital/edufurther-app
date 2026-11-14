import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import { backendOrigin, proxySecret } from './src/lib/backend';
import { posthogHosts } from './src/lib/posthogHost';
import { PWA_HEADERS, SECURITY_HEADERS } from './src/lib/securityHeaders';

/**
 * Same-origin API proxy (product, 2026-09-27; ADR 0003). The browser calls
 * `/api/v1/…` on this app and src/proxy.ts forwards it to BACKEND_URL, adding
 * the origin-lock header (backend #426). The rewrite lives there, not in
 * `rewrites()`, because a config rewrite cannot add a request header. Checked
 * here so a missing or malformed BACKEND_URL or EDGE_PROXY_SECRET fails the
 * build. Both are server-only: neither is ever sent to the browser.
 */
backendOrigin();
proxySecret();
// Checked here too: a malformed POSTHOG_HOST fails the build. /ingest is
// forwarded by src/proxy.ts (PRD 30), never by a config rewrite.
posthogHosts();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next dev otherwise appends its own block to the project CLAUDE.md, which is user-owned.
  agentRules: false,
  // Every source × width × quality the optimizer makes is a billed Vercel
  // transformation (owner's cost rules, 2026-11-07). Photos are plain <img>
  // straight from Supabase Storage and the logo is pre-sized (BrandLogo), so
  // nothing remote is allowed through: a remote next/image, if ever needed,
  // takes its host from NEXT_PUBLIC_SUPABASE_URL, never a wildcard. Few
  // widths, cached a month: storage URLs are content-addressed (backend ADR 0019).
  images: {
    remotePatterns: [],
    deviceSizes: [640, 1080, 1920],
    imageSizes: [48, 96, 256],
    minimumCacheTTL: 2678400,
  },
  // The link previews (invite, mentor profile) read their fonts and logos
  // from disk at request time (lib/og/ogAssets); trace them into those functions.
  outputFileTracingIncludes: {
    '/invite/**': ['./src/app/fonts/og/*.ttf', './public/brand/*.png'],
    '/mentors/**': ['./src/app/fonts/og/*.ttf', './public/brand/*.png'],
  },
  async headers() {
    return [...SECURITY_HEADERS, ...PWA_HEADERS];
  },
  // PostHog's endpoints end in a slash (`/ingest/e/`); Next's redirect would
  // drop it. src/proxy.ts makes that redirect itself for every other page.
  skipTrailingSlashRedirect: true,
};

/**
 * Error tracking (lib/vendor/errors): only a build with Sentry on AND the
 * upload token is wrapped, so every other build is exactly as before. The
 * wrapper uploads the source maps after the build and deletes them, so the
 * site never serves them. SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are
 * build-only (never NEXT_PUBLIC_). Errors themselves need no wrapper: they
 * come from instrumentation.ts and instrumentation-client.ts.
 */
const sentryUpload =
  process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true' &&
  !!process.env.SENTRY_AUTH_TOKEN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT;

export default sentryUpload
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      telemetry: false,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig;
