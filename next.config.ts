import type { NextConfig } from 'next';
import { backendOrigin, proxySecret } from './src/lib/backend';
import { SECURITY_HEADERS } from './src/lib/securityHeaders';

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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next dev otherwise appends its own block to the project CLAUDE.md, which is user-owned.
  agentRules: false,
  images: {
    // Mentor avatars come from Supabase Storage (backend ADR 0019). Narrow this
    // to the project host once the backend confirms it.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  // The invite link preview reads its fonts and logos from disk at request
  // time (opengraph-image.tsx); trace them into that function.
  outputFileTracingIncludes: {
    '/invite/**': ['./src/app/fonts/og/*.ttf', './public/brand/*.png'],
  },
  async headers() {
    return SECURITY_HEADERS;
  },
};

export default nextConfig;
