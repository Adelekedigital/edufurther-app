'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { authConfigured } from '@/lib/vendor/supabase/config';
import type { Viewer } from '@/types/mentor';
import { ApiError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { useSession } from './session';

type UserRead = components['schemas']['UserRead'];

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
    completedSessions: me.mentee_completed_sessions,
    credits: me.credits
      ? { balance: me.credits.balance, allowance: me.credits.allowance, state: me.credits.state }
      : null,
  };
}

/** Local dev / CI page review without auth (NEXT_PUBLIC_MOCK_VIEWER). */
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
    credits: { balance: 3, allowance: 3, state: 'on_track' },
  },
  mentor: {
    kind: 'member',
    id: 'mock-mentor',
    firstName: 'Gbenga',
    initial: 'G',
    isMentee: false,
    isApprovedMentor: true,
    isMentor: true,
    completedSessions: 0,
    credits: null,
  },
};

const readMockParam = () => new URLSearchParams(window.location.search).get('mockViewer');
const onPopState = (cb: () => void) => {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
};

/** Screens only a mentor can use: in mock mode they default to the mentor viewer. */
const MENTOR_ONLY_ROUTES = ['/session-types'];

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
  return MOCK_VIEWERS[param ?? byRoute] ?? MOCK_VIEWERS[env] ?? null;
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
