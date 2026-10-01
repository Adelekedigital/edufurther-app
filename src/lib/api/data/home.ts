import createClient from 'openapi-fetch';
import type { components, paths } from '@/lib/api/generated/schema';

/**
 * Where `/` sends each viewer (product, 2026-09-30). Server-only: app/page.tsx
 * decides before any HTML is sent, so nobody sees the wrong page first.
 */
export type Home = '/explore' | '/dashboard' | '/admin';

type Me = Pick<components['schemas']['UserRead'], 'is_admin' | 'mentor_profile'>;

/** Platform admins first (even if also a mentor), then any mentor profile; everyone else Explore. */
export function homeFor(me: Me | null): Home {
  if (!me) return '/explore';
  if (me.is_admin) return '/admin';
  if (me.mentor_profile) return '/dashboard';
  return '/explore';
}

/** Local dev / CI without auth (NEXT_PUBLIC_MOCK_VIEWER): `admin` exists for routing checks only. */
const MOCK_ROLES: Record<string, Me | null> = {
  guest: null,
  mentee: { is_admin: false, mentor_profile: null },
  mentor: { is_admin: false, mentor_profile: {} as NonNullable<Me['mentor_profile']> },
  admin: { is_admin: true, mentor_profile: null },
};

/** Past this, `/` stops waiting and sends the viewer to Explore, which loads them itself. */
export const HOME_ME_TIMEOUT_MS = 2500;

/**
 * The viewer's home. `accessToken` is the one the proxy just verified (null:
 * signed out, or the check failed), so this never touches Supabase. A failed
 * or slow /me falls back to Explore, which shows the account notices.
 */
export async function fetchHome({
  accessToken,
  mockViewer = null,
}: {
  accessToken: string | null;
  mockViewer?: string | null;
}): Promise<Home> {
  const mock = process.env.NEXT_PUBLIC_MOCK_VIEWER;
  if (mock) {
    // Own keys only, as in viewer.ts: `?mockViewer=constructor` stays out.
    const key = mockViewer && Object.hasOwn(MOCK_ROLES, mockViewer) ? mockViewer : mock;
    return homeFor(Object.hasOwn(MOCK_ROLES, key) ? MOCK_ROLES[key]! : null);
  }
  const base = process.env.BACKEND_URL?.trim();
  if (!accessToken || !base) return '/explore';
  // The server's own instance: http.ts's client is for the browser (same-origin
  // base, the SDK's token). This one calls the backend directly, per request.
  const api = createClient<paths>({ baseUrl: base });
  try {
    const { data } = await api.GET('/api/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(HOME_ME_TIMEOUT_MS),
    });
    return homeFor(data ?? null);
  } catch {
    return '/explore';
  }
}
