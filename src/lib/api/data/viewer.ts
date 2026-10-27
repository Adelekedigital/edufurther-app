'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { authConfigured } from '@/lib/vendor/supabase/config';
import type { Viewer } from '@/types/mentor';
import { isUnder, mentorStageOf, routeRole } from '@/lib/utils/access';
import { coverKey } from '@/lib/utils/cover';
import { readMockParam } from '@/lib/utils/mockViewerParam';
import { useHydrated } from '@/lib/utils/useHydrated';
import { clampFocus, personInitials } from '@/lib/utils/person';
import { toCredits } from './credits';
import { ApiError } from './errors';
import { api } from './http';
import { menteeByChoice } from './roles';
import { keys } from './keys';
import { useSession } from './session';

type UserRead = components['schemas']['UserRead'];

/**
 * GET /api/v1/me → Viewer (backend auth reply #3). Roles come from rows, never
 * `primary_role`: goal → mentee, approved mentor_profile → mentor.
 */
export function toViewer(me: UserRead): Extract<Viewer, { kind: 'member' }> {
  const name = me.first_name?.trim() || me.email.split('@')[0] || '';
  // A declined applicant who chose mentee is mentee-side: no mentor nav, badge or home.
  const mentor = me.mentor_profile && !menteeByChoice(me) ? me.mentor_profile : null;
  return {
    kind: 'member',
    id: me.id,
    firstName: name,
    initials: personInitials(me.first_name, me.last_name, me.email),
    isMentee: me.goal != null,
    isApprovedMentor: me.mentor_profile?.approval_status === 'approved',
    isMentor: mentor != null,
    // Signed up as a mentor and hasn't started the application: the account
    // remembers it (primary_role), so onboarding continues as a mentor.
    signedUpAsMentor: !me.mentor_profile && me.goal == null && me.primary_role === 'mentor',
    hasMentorProfile: !!me.mentor_profile,
    // Any onboarding step saved (mentee or mentor): the account has settled a path.
    onboardingStarted: !!me.onboarding?.last_step,
    mentorApprovedSeen: me.mentor_profile?.approved_seen_at !== null,
    // Mentee-side (no profile, or declined and chose mentee) reads `none`.
    mentorStage: mentorStageOf(mentor),
    // Unknown (an older /me) is finished: nobody is locked on a guess.
    onboardingComplete: me.onboarding?.complete ?? true,
    isListedMentor: me.mentor_profile?.listing_status === 'listed',
    timeZone: me.timezone || undefined,
    completedSessions: me.mentee_completed_sessions,
    createdAt: me.created_at,
    credits: me.credits ? toCredits(me.credits) : null,
    avatarUrl: me.profile?.avatar_url ?? null,
    avatarFocus: clampFocus(me.profile?.avatar_focus),
    coverKey: coverKey(me.profile?.cover_color),
    // The nav follows the mentor role whenever a mentor profile exists, so the
    // badge does too.
    awaitingResponse: mentor
      ? (me.booking_counts?.as_mentor?.awaiting_your_response ?? null)
      : (me.booking_counts?.as_mentee?.awaiting_mentor ?? null),
    menteeCancelRefundHours: me.mentee_cancel_refund_hours ?? null,
    sessionTypeLimit: me.session_type_limit ?? null,
    isAdmin: me.is_admin === true,
    // A grant with no role named reads as the narrowest one: the UI never offers
    // a decision the API might refuse.
    adminRole: me.is_admin ? (me.admin_role ?? 'limited_access') : null,
    bookingCounts: {
      pending: sumSides(
        me.booking_counts?.as_mentor?.awaiting_your_response,
        me.booking_counts?.as_mentee?.awaiting_mentor,
      ),
      upcoming: sumSides(
        me.booking_counts?.as_mentor?.upcoming,
        me.booking_counts?.as_mentee?.upcoming,
      ),
    },
  };
}

/**
 * The Bookings tabs mix both sides in one list, so their counts add up — a
 * mentor who also books as a mentee has two of each (backend reply §10). Null
 * only when neither side has a number: zero is a real count, and treating it
 * as "unknown" would blank a tab that is legitimately empty.
 */
function sumSides(a: number | null | undefined, b: number | null | undefined): number | null {
  return a == null && b == null ? null : (a ?? 0) + (b ?? 0);
}

/**
 * Local dev / CI page review without auth (NEXT_PUBLIC_MOCK_VIEWER).
 *
 * **`bookingCounts` here is not derived from the sessions fixture, and does not
 * agree with it.** These are already-mapped `Viewer` objects, so `/api/v1/me`
 * is never called and the summing in `toViewer` never runs; the lists come from
 * `app/api/mock/api/v1/users/[userId]/sessions`, which has eight upcoming and
 * five pending rows against the 6 and 3 below.
 *
 * So in dev a tab count disagreeing with the list under it is expected here and
 * is not a bug. It is worth knowing because `review-page.mjs` and every dev
 * screenshot run against this viewer, and a real count-versus-list defect looks
 * exactly the same — one was raised against the Pending badge in PR 235 (the
 * server's aggregate keeps counting a lapsed request), and this fixture had me
 * reporting the same symptom from a different cause.
 *
 * Not reconciled on purpose: matching the numbers by hand would drift the next
 * time either fixture changes, and deriving them would couple this to the mock
 * route. If dev ever needs counts that can be trusted, derive both from one
 * place rather than re-syncing two.
 */
const MOCK_VIEWERS: Record<string, Viewer> = {
  guest: { kind: 'guest' },
  mentee: {
    kind: 'member',
    id: 'mock-viewer',
    firstName: 'Esther',
    initials: 'EO',
    isMentee: true,
    isApprovedMentor: false,
    isMentor: false,
    mentorStage: 'none',
    onboardingComplete: true,
    completedSessions: 0,
    credits: {
      balance: 4,
      state: 'on_track',
      nextResetAt: '2026-11-01T00:00:00Z',
      monthly: { balance: 3, ceiling: 3, expiresAt: '2026-11-01T00:00:00Z', unlocked: true },
      bonus: { balance: 1, groups: [{ count: 1, expiresAt: null }] },
    },
    avatarUrl: '/api/mock/avatars/mentor-01.webp',
    avatarFocus: { x: 0.5, y: 0.35 },
    coverKey: null,
    awaitingResponse: 1,
    bookingCounts: { pending: 3, upcoming: 6 },
    // Not 12, so a number baked into copy would be visible in dev.
    menteeCancelRefundHours: 10,
  },
  mentor: {
    kind: 'member',
    id: 'mock-mentor',
    firstName: 'Gbenga',
    initials: 'GE',
    isMentee: false,
    isApprovedMentor: true,
    isMentor: true,
    isListedMentor: true,
    mentorStage: 'approved',
    onboardingComplete: true,
    completedSessions: 0,
    credits: null,
    // No photo, like the mock profile it owns: the initials on its cover tone.
    avatarUrl: null,
    avatarFocus: null,
    coverKey: null,
    awaitingResponse: 12,
    bookingCounts: { pending: 3, upcoming: 6 },
    // Not 12, so a number baked into copy would be visible in dev.
    // Not the default 5, so a limit baked into copy would be visible in dev; 6
    // leaves room past the four seeded sessions (the Intro chat among them).
    sessionTypeLimit: 6,
    menteeCancelRefundHours: 10,
  },
};

// Someone who joined as a mentor and hasn't applied yet (/onboarding/mentor):
// no goal, no mentor profile. The mock /me routes act for 'mock-viewer'.
MOCK_VIEWERS['mentor-applicant'] = {
  ...(MOCK_VIEWERS.mentee as Extract<Viewer, { kind: 'member' }>),
  firstName: 'Gbenga',
  initials: 'GE',
  isMentee: false,
  // Remembered on the account at sign-up (#346): the setup lock applies.
  signedUpAsMentor: true,
  onboardingComplete: false,
  credits: null,
  avatarUrl: null,
  avatarFocus: null,
  awaitingResponse: 0,
  bookingCounts: { pending: 0, upcoming: 0 },
};

// Home's two views (Mentee Dashboard v2). `mentee-new`: no session held and
// 3 free sessions a month not yet on, so the new view's invite step is open.
// The sessions mock is shared by every viewer, so it still has bookings: it
// shows the booked stage (with the Next session card), not incomplete or ready.
// The default `mentee` (no session held either) shows the new view too.
MOCK_VIEWERS['mentee-new'] = {
  ...(MOCK_VIEWERS.mentee as Extract<Viewer, { kind: 'member' }>),
  awaitingResponse: 0,
  bookingCounts: { pending: 0, upcoming: 0 },
  credits: {
    balance: 1,
    state: 'on_track',
    nextResetAt: '2026-11-01T00:00:00Z',
    monthly: { balance: 0, ceiling: 0, expiresAt: null, unlocked: false },
    bonus: { balance: 1, groups: [{ count: 1, expiresAt: null }] },
  },
};
MOCK_VIEWERS['mentee-returning'] = {
  ...(MOCK_VIEWERS.mentee as Extract<Viewer, { kind: 'member' }>),
  completedSessions: 12,
};

// The same mentee, onboarding unfinished: the setup lock (Home → /onboarding).
MOCK_VIEWERS['mentee-unfinished'] = {
  ...(MOCK_VIEWERS.mentee as Extract<Viewer, { kind: 'member' }>),
  onboardingComplete: false,
};

// The setup lock's mentor states (lib/utils/access): in review, and declined.
MOCK_VIEWERS['mentor-review'] = {
  ...(MOCK_VIEWERS.mentor as Extract<Viewer, { kind: 'member' }>),
  isApprovedMentor: false,
  isListedMentor: false,
  mentorStage: 'pending',
};
MOCK_VIEWERS['mentor-declined'] = {
  ...(MOCK_VIEWERS['mentor-review'] as Extract<Viewer, { kind: 'member' }>),
  mentorStage: 'declined',
};
// A mentor profile that was never submitted: the mentor setup lock.
MOCK_VIEWERS['mentor-unsubmitted'] = {
  ...(MOCK_VIEWERS['mentor-review'] as Extract<Viewer, { kind: 'member' }>),
  mentorStage: 'unsubmitted',
};

// Platform admins (Admin PRD): a mentee and a mentor who also hold a grant.
MOCK_VIEWERS.admin = {
  ...(MOCK_VIEWERS.mentee as Extract<Viewer, { kind: 'member' }>),
  firstName: 'Ada',
  initials: 'AO',
  isAdmin: true,
  adminRole: 'super_admin',
};
MOCK_VIEWERS['admin-mentor'] = {
  ...(MOCK_VIEWERS.mentor as Extract<Viewer, { kind: 'member' }>),
  isAdmin: true,
  adminRole: 'super_admin',
};
MOCK_VIEWERS['admin-limited'] = { ...MOCK_VIEWERS.admin, adminRole: 'limited_access' } as Viewer;

/** The mock viewer before hydration has read `?mockViewer=`. */
const MOCK_PENDING: Viewer = { kind: 'loading', signedIn: true };

const onPopState = (cb: () => void) => {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
};

/**
 * Dev and CI only: on a mentor page (ROUTE_ROLES) the mock defaults to the
 * approved mentor, so one mentee-default build reviews it as its real user.
 * `?mockViewer=` wins, so `?mockViewer=mentee` on /dashboard shows the role
 * redirect in dev.
 */
const onMentorPage = (path: string | null) => !!path && routeRole(path) === 'mentor';
/** Likewise the admin pages default to an admin. */
const onAdminPage = (path: string | null) => !!path && isUnder(path, '/admin');

/**
 * The mock viewer, or null when NEXT_PUBLIC_MOCK_VIEWER is unset (every real
 * deploy). While it is set (local dev, CI):
 * - mentor pages default to the mentor (onMentorPage);
 * - `?mockViewer=<key>` (any MOCK_VIEWERS key) overrides it for manual
 *   checks, the route default included, and a role redirect keeps it
 *   (keepMockViewer);
 * - the server can't see the param, so the server render and the first paint
 *   are `loading`, as a real viewer is before /me: no redirect or gate ever
 *   acts on the default before the param applies, and the HTML matches.
 */
function useMockViewer(): Viewer | null {
  const env = process.env.NEXT_PUBLIC_MOCK_VIEWER;
  const path = usePathname();
  const param = useSyncExternalStore(
    onPopState,
    () => (env ? readMockParam() : null),
    () => null,
  );
  const hydrated = useHydrated();
  if (!env) return null;
  if (!hydrated) return MOCK_PENDING;
  const byRoute = onMentorPage(path) ? 'mentor' : onAdminPage(path) ? 'admin' : env;
  const pick = param ?? byRoute;
  // Own keys only: `?mockViewer=constructor` must not reach Object.prototype.
  const key = Object.hasOwn(MOCK_VIEWERS, pick) ? pick : env;
  return Object.hasOwn(MOCK_VIEWERS, key) ? MOCK_VIEWERS[key]! : null;
}

const UNLINKED = Symbol('unlinked');
const ACCOUNT_EXISTS = Symbol('accountExists');

export function useViewer(): Viewer {
  const mock = useMockViewer();
  const session = useSession();
  const userId = session.status === 'present' ? session.userId : null;
  const query = useQuery({
    queryKey: keys.viewer.me(userId ?? 'none'),
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET('/api/v1/me', { signal });
      // No backend account for this identity (no self-signup yet): a state, not
      // an error, and not worth retrying.
      if (response.status === 404) return UNLINKED;
      // The email belongs to an existing account that isn't linked to this sign-in.
      if (response.status === 409) return ACCOUNT_EXISTS;
      if (!data) throw new ApiError(response.status);
      return toViewer(data);
    },
    enabled: !mock && authConfigured && userId !== null,
    staleTime: 60_000,
  });

  if (mock) return mock;
  if (!authConfigured || session.status === 'none') return { kind: 'guest' };
  if (session.status === 'unknown') return { kind: 'loading', signedIn: null };
  // Error before empty: a failed /me must not leave the page loading forever.
  if (query.isError && !query.data)
    return { kind: 'error', retry: () => void query.refetch(), retrying: query.isFetching };
  if (!query.data) return { kind: 'loading', signedIn: true };
  if (query.data === UNLINKED) return { kind: 'unlinked' };
  if (query.data === ACCOUNT_EXISTS) return { kind: 'accountExists' };
  return query.data;
}

type Member = Extract<Viewer, { kind: 'member' }>;

/**
 * A write the viewer just made (photo, cover colour), copied into the cached
 * /me at once, so the sidebar matches the profile even if the refetch fails.
 */
export function patchViewer(
  qc: QueryClient,
  patch: Partial<
    Pick<
      Member,
      | 'avatarUrl'
      | 'avatarFocus'
      | 'coverKey'
      | 'onboardingComplete'
      | 'mentorApprovedSeen'
      | 'signedUpAsMentor'
      | 'isMentor'
      | 'mentorStage'
    >
  >,
) {
  qc.setQueriesData<unknown>({ queryKey: keys.viewer.all }, (v: unknown) =>
    typeof v === 'object' && v !== null && (v as Viewer).kind === 'member'
      ? { ...(v as Member), ...patch }
      : v,
  );
}
