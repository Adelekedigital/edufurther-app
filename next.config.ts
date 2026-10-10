import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './src/lib/securityHeaders';

/**
 * Same-origin API proxy (product, 2026-09-27). The browser calls `/api/v1/…` on
 * this app and Vercel forwards it to BACKEND_URL, so preview deployments (a new
 * URL each time) never need a CORS entry on the backend, whose allow-list is exact
 * origins only. BACKEND_URL is server-only: it is never sent to the browser.
 *   Vercel production → the prod backend; Vercel preview → edufurtherbe-dev.
 * Local dev and CI page review use the in-app mock (NEXT_PUBLIC_API_BASE_URL).
 */
function backendUrl(): string | null {
  const raw = process.env.BACKEND_URL?.trim();
  if (!raw) {
    if (process.env.VERCEL === '1') {
      throw new Error(
        'BACKEND_URL is not set for this Vercel environment (see README, Deploying).',
      );
    }
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`BACKEND_URL is not a URL: ${raw}`);
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('BACKEND_URL must be https (http only for localhost).');
  }
  return url.origin;
}

const backend = backendUrl();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next dev otherwise appends its own block to the project CLAUDE.md, which is user-owned.
  agentRules: false,
  images: {
    // Mentor avatars come from Supabase Storage (backend ADR 0019). Narrow this
    // to the project host once the backend confirms it.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  async headers() {
    return SECURITY_HEADERS;
  },
  async rewrites() {
    return backend ? [{ source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*` }] : [];
  },
};

export default nextConfig;
