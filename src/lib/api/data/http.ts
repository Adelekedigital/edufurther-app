import createClient from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema';

/**
 * The only place the generated client is instantiated.
 *
 * NEXT_PUBLIC_API_BASE_URL:
 *   - real backend: http://localhost:8000 (backend reply #10)
 *   - phase A mock: /api/mock  → served by app/api/mock/… route handlers,
 *     which only answer when ENABLE_MOCK_API=1.
 */
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  // `offering=a&offering=b`, which is what the backend reads (backend reply #1).
  // PHASE B: send the bearer token when signed in — /mentors orders by the
  // mentee's goals for signed-in users (backend reply #8).
  querySerializer: { array: { style: 'form', explode: true } },
});
