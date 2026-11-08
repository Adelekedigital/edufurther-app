import createClient from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema';
import { getAccessToken, refreshAccessToken, signOut } from '@/lib/vendor/supabase/browser';
import { createAuthMiddleware } from './authMiddleware';
import { createPreviewMiddleware, isPreviewEnded } from './previewMiddleware';

/**
 * The browser's generated client. The server-side calls build their own:
 * /me for the `/` redirect in home.ts (ADR 0005), and Join's /join and /door in
 * sessionEnter.ts (ADR 0009).
 *
 * NEXT_PUBLIC_API_BASE_URL:
 *   - unset (deployed): same origin, `/api/v1/…`, proxied to BACKEND_URL by the
 *     rewrite in src/proxy.ts. Locally, set BACKEND_URL=http://localhost:8000.
 *   - phase A mock: /api/mock  → served by app/api/mock/… route handlers,
 *     which only answer when ENABLE_MOCK_API=1.
 */
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  // `offering=a&offering=b`, which is what the backend reads (backend reply #1).
  querySerializer: { array: { style: 'form', explode: true } },
});

// Preview as user: first, so the auth middleware's retry clone carries the
// preview header, and its 401 (preview ended) is never refreshed and retried
// as the admin.
api.use(createPreviewMiddleware());
// Signed in → every call carries the bearer token (backend auth reply #3):
// /mentors then orders by the mentee's goals and leaves the caller out.
api.use(
  createAuthMiddleware({
    getToken: getAccessToken,
    refresh: refreshAccessToken,
    onExpired: signOut,
    isFinal: isPreviewEnded,
  }),
);
