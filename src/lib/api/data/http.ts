import createClient from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema';
import { getAccessToken, refreshAccessToken, signOut } from '@/lib/vendor/supabase/browser';
import { createAuthMiddleware } from './authMiddleware';

/**
 * The only place the generated client is instantiated.
 *
 * NEXT_PUBLIC_API_BASE_URL:
 *   - unset (deployed): same origin, `/api/v1/…`, proxied to BACKEND_URL by the
 *     rewrite in next.config.ts. Locally, set BACKEND_URL=http://localhost:8000.
 *   - phase A mock: /api/mock  → served by app/api/mock/… route handlers,
 *     which only answer when ENABLE_MOCK_API=1.
 */
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  // `offering=a&offering=b`, which is what the backend reads (backend reply #1).
  querySerializer: { array: { style: 'form', explode: true } },
});

// Signed in → every call carries the bearer token (backend auth reply #3):
// /mentors then orders by the mentee's goals and leaves the caller out.
api.use(
  createAuthMiddleware({
    getToken: getAccessToken,
    refresh: refreshAccessToken,
    onExpired: signOut,
  }),
);
