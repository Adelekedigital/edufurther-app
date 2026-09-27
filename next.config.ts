import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next dev otherwise appends its own block to the project CLAUDE.md, which is user-owned.
  agentRules: false,
  images: {
    // Mentor avatars come from Supabase Storage (backend ADR 0019). Narrow this
    // to the project host once the backend confirms it.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
};

export default nextConfig;
