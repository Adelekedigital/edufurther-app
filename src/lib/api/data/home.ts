import createClient from 'openapi-fetch';
import type { components, paths } from '@/lib/api/generated/schema';
import { memberHome, mentorStageOf } from '@/lib/utils/access';
import { menteeByChoice } from './roles';

/**
 * Where `/` sends each viewer (product, 2026-09-30). Server-only: app/page.tsx
 * decides before any HTML is sent, so nobody sees the wrong page first.
 */
export type Home =
  | '/explore'
  | '/home'
  | '/dashboard'
  | '/admin'
  | '/onboarding'
  | '/onboarding/mentor'
  | '/mentor-application';

type Profile = components['schemas']['MentorProfileRead'];
// What the router reads: who the member is, and how far their setup has got.
type Me = Pick<components['schemas']['UserRead'], 'is_admin'> &
  Partial<Pick<components['schemas']['UserRead'], 'primary_role' | 'onboarding' | 'goal'>> & {
    mentor_profile?:
      | (Pick<Profile, 'approval_status'> &
          Partial<Pick<Profile, 'submitted_at' | 'approved_seen_at'>>)
      | null;
  };

/**
 * Platform admins first (even if also a mentor), then the member's own home,
 * the same rule sign-in uses (memberHome, lib/utils/access): a mentor profile
 * → the dashboard, or the application while it isn't approved (or approved
 * and not yet seen); everyone else → the mentee home, goal or not (product,
 * 2026-10-15), or onboarding while it isn't finished. Each detour only while
 * its page is switched on. A guest and any failed or unlinked /me fall back
 * to Explore.
 */
export function homeFor(me: Me | null): Home {
  if (!me) return '/explore';
  if (me.is_admin) return '/admin';
  const p = me.mentor_profile;
  const mentor = !!p && !menteeByChoice(me);
  return memberHome({
    isMentor: mentor,
    mentorStage: mentor ? mentorStageOf(p) : 'none',
    // Absent (an older backend): seen, as sign-in reads it.
    mentorApprovedSeen: p?.approved_seen_at === undefined ? undefined : p.approved_seen_at !== null,
    onboardingComplete: me.onboarding?.complete,
    signedUpAsMentor: !p && me.goal == null && me.primary_role === 'mentor',
  });
}

/** Local dev / CI without auth (NEXT_PUBLIC_MOCK_VIEWER): `admin` exists for routing checks only. */
const MOCK_ROLES: Record<string, Me | null> = {
  guest: null,
  mentee: { is_admin: false, mentor_profile: null },
  mentor: { is_admin: false, mentor_profile: { approval_status: 'approved' } },
  admin: { is_admin: true, mentor_profile: null },
  'mentee-unfinished': {
    is_admin: false,
    mentor_profile: null,
    onboarding: { complete: false, missing: ['origin'] },
  },
  'mentor-review': {
    is_admin: false,
    mentor_profile: { approval_status: 'pending', submitted_at: '2026-10-01T00:00:00Z' },
  },
  'mentor-declined': { is_admin: false, mentor_profile: { approval_status: 'declined' } },
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
