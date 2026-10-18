'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { authConfigured } from '@/lib/vendor/supabase/config';
import type { Viewer } from '@/types/mentor';
import { coverKey } from '@/lib/utils/cover';
import { ApiError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { useSession } from './session';

type UserRead = components['schemas']['UserRead'];

/** `/me onboarding.missing` → the nudge's two parts (help; origin/degree/field → plans). */
export function nudgeParts(missing: readonly string[] | null | undefined): ('help' | 'plans')[] {
  if (!missing) return [];
  const parts: ('help' | 'plans')[] = [];
  if (missing.includes('help')) parts.push('help');
  if (missing.some((m) => m !== 'help')) parts.push('plans');
  return parts;
}

/**
 * GET /api/v1/me → Viewer (backend auth reply #3). Roles come from rows, never
 * `primary_role`: goal → mentee, approved mentor_profile → mentor.
 */
export function toViewer(me: UserRead): Extract<Viewer, { kind: 'member' }> {
  const name = me.first_name?.trim() || me.email.split('@')[0] || '';
  return {
    kind: 'member',
    id: me.id,
    firstName: name,
    initial: (name[0] ?? '?').toUpperCase(),
    isMentee: me.goal != null,
    isApprovedMentor: me.mentor_profile?.approval_status === 'approved',
    isMentor: me.mentor_profile != null,
    isListedMentor: me.mentor_profile?.listing_status === 'listed',
    timeZone: me.timezone || undefined,
    completedSessions: me.mentee_completed_sessions,
    onboardingMissing: nudgeParts(me.onboarding?.missing),
    createdAt: me.created_at,
    credits: me.credits
      ? {
          balance: me.credits.balance,
          state: me.credits.state,
          nextResetAt: me.credits.next_reset_at ?? null,
          monthly: {
            balance: me.credits.monthly.balance,
            ceiling: me.credits.monthly.ceiling,
            expiresAt: me.credits.monthly.expires_at,
            unlocked: me.credits.monthly.unlocked,
          },
          bonus: {
            balance: me.credits.bonus.balance,
            groups: me.credits.bonus.groups.map((g) => ({
              count: g.count,
              expiresAt: g.expires_at,
            })),
          },
        }
      : null,
    avatarUrl: me.profile?.avatar_url ?? null,
    avatarFocus: me.profile?.avatar_focus ?? null,
    coverKey: coverKey(me.profile?.cover_color),
    // The nav follows the mentor role whenever a mentor profile exists, so the
    // badge does too.
    awaitingResponse: me.mentor_profile
      ? (me.booking_counts?.as_mentor?.awaiting_your_response ?? null)
      : (me.booking_counts?.as_mentee?.awaiting_mentor ?? null),
    menteeCancelRefundHours: me.mentee_cancel_refund_hours ?? null,
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
    initial: 'E',
    isMentee: true,
    isApprovedMentor: false,
    isMentor: false,
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
  // The same mentee, still owing their study plans: the onboarding nudge on Home.
  get 'mentee-unfinished'(): Viewer {
    return {
      ...(MOCK_VIEWERS.mentee as Extract<Viewer, { kind: 'member' }>),
      onboardingMissing: ['plans'],
    };
  },
  mentor: {
    kind: 'member',
    id: 'mock-mentor',
    firstName: 'Gbenga',
    initial: 'G',
    isMentee: false,
    isApprovedMentor: true,
    isMentor: true,
    isListedMentor: true,
    completedSessions: 0,
    credits: null,
    // No photo, like the mock profile it owns: the initial on its cover tone.
    avatarUrl: null,
    avatarFocus: null,
    coverKey: null,
    awaitingResponse: 12,
    bookingCounts: { pending: 3, upcoming: 6 },
    // Not 12, so a number baked into copy would be visible in dev.
    menteeCancelRefundHours: 10,
  },
};

const readMockParam = () => new URLSearchParams(window.location.search).get('mockViewer');
const onPopState = (cb: () => void) => {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
};

/** Screens only a mentor can use: in mock mode they default to the mentor viewer. */
const MENTOR_ONLY_ROUTES = ['/session-types', '/dashboard'];

/**
 * The mock viewer, or null when NEXT_PUBLIC_MOCK_VIEWER is unset (every real
 * deploy). While it is set (local dev, CI):
 * - mentor-only routes default to the mentor, so one CI build (mentee by
 *   default) reviews them as their real user. The path is known on the server
 *   too, so hydration matches and nothing flips (CLS);
 * - `?mockViewer=mentor|mentee|guest` overrides it for manual checks. It is
 *   read through useSyncExternalStore (the server snapshot is null), so it
 *   applies right after hydration.
 */
function useMockViewer(): Viewer | null {
  const env = process.env.NEXT_PUBLIC_MOCK_VIEWER;
  const path = usePathname();
  const param = useSyncExternalStore(
    onPopState,
    () => (env ? readMockParam() : null),
    () => null,
  );
  if (!env) return null;
  const byRoute = MENTOR_ONLY_ROUTES.some((r) => path?.startsWith(r)) ? 'mentor' : env;
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
  patch: Partial<Pick<Member, 'avatarUrl' | 'avatarFocus' | 'coverKey'>>,
) {
  qc.setQueriesData<unknown>({ queryKey: keys.viewer.all }, (v: unknown) =>
    typeof v === 'object' && v !== null && (v as Viewer).kind === 'member'
      ? { ...(v as Member), ...patch }
      : v,
  );
}
