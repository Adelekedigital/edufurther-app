import type { NextConfig } from 'next';
import { backendOrigin, proxySecret } from './src/lib/backend';
import { posthogRewrites } from './src/lib/posthogHost';
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
// Checked here too: a malformed POSTHOG_HOST fails the build.
const analyticsRewrites = posthogRewrites();

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
  // The invite link preview reads its fonts and logos from disk at request
  // time (opengraph-image.tsx); trace them into that function.
  outputFileTracingIncludes: {
    '/invite/**': ['./src/app/fonts/og/*.ttf', './public/brand/*.png'],
  },
  async headers() {
    return [...SECURITY_HEADERS, ...PWA_HEADERS];
  },
  // PRD 30: PostHog through this origin (`/ingest`), so the browser never
  // calls the vendor's host. src/proxy.ts strips cookies and credentials from
  // these requests first: a rewrite would otherwise forward the session cookie.
  async rewrites() {
    return analyticsRewrites;
  },
  // PostHog's endpoints end in a slash (`/ingest/e/`); Next's redirect would drop it.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
