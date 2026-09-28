'use client';

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
function mockViewer(): Viewer | null {
  const mock = process.env.NEXT_PUBLIC_MOCK_VIEWER;
  if (mock === 'guest') return { kind: 'guest' };
  if (mock === 'mentee')
    return {
      kind: 'member',
      id: 'mock-viewer',
      firstName: 'Esther',
      initial: 'E',
      isMentee: true,
      isApprovedMentor: false,
      isMentor: false,
      completedSessions: 0,
      credits: { balance: 3, allowance: 3, state: 'on_track' },
    };
  if (mock === 'mentor')
    return {
      kind: 'member',
      id: 'mock-mentor',
      firstName: 'Gbenga',
      initial: 'G',
      isMentee: false,
      isApprovedMentor: true,
      isMentor: true,
      completedSessions: 0,
      credits: null,
    };
  return null;
}

const UNLINKED = Symbol('unlinked');
const ACCOUNT_EXISTS = Symbol('accountExists');

export function useViewer(): Viewer {
  const mock = mockViewer();
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
