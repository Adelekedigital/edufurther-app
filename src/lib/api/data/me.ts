'use client';

import { useCallback } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Viewer } from '@/types/mentor';
import type { MenteeProfileValues } from '@/types/settings';
import { apiError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { useSession } from './session';

export type UserRead = components['schemas']['UserRead'];
type Member = Extract<Viewer, { kind: 'member' }>;

/** No backend account for this sign-in (404): a state, not an error. */
export const UNLINKED = Symbol('unlinked');
/** The email belongs to an account not linked to this sign-in (409). */
export const ACCOUNT_EXISTS = Symbol('accountExists');

/**
 * A write the viewer just made (photo, cover colour, a seen key), shown in the
 * shell at once, so it matches even if the refetch fails (patchViewer).
 */
export type ViewerPatch = Partial<
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
    | 'seenItems'
  >
>;

/** What a Settings › Profile save (or a photo change) landed, shown before /me is read again. */
export type ProfilePatch = Partial<MenteeProfileValues & { photoUrl: string | null }>;

/**
 * GET /me as the cache holds it: the reply, plus what the viewer's own writes
 * put over it. The overlays are in the viewer's terms because some of them
 * (isMentor, mentorStage) are derived and can't be written back into the
 * reply; the next read replaces the whole entry, overlays and all.
 */
export type MeRead = { me: UserRead; viewer: ViewerPatch | null; profile: ProfilePatch | null };
export type MeEntry = MeRead | typeof UNLINKED | typeof ACCOUNT_EXISTS;

export const isMeRead = (e: unknown): e is MeRead =>
  typeof e === 'object' && e !== null && 'me' in e && 'viewer' in e && 'profile' in e;

/** A fresh entry for a reply: no overlays. */
export const meRead = (me: UserRead): MeRead => ({ me, viewer: null, profile: null });

async function fetchMe({ signal }: { signal: AbortSignal }): Promise<MeEntry> {
  const { data, error, response } = await api.GET('/api/v1/me', { signal });
  if (response.status === 404) return UNLINKED;
  if (response.status === 409) return ACCOUNT_EXISTS;
  if (!data) throw apiError(response.status, error);
  return meRead(data);
}

/**
 * The one GET /me. The shell (useViewer), Settings and Home's goal and profile
 * reads all observe this query and `select` their slice, so a screen sends one
 * request, not one per reader, and a write to it reaches every reader.
 *
 * Keyed by the session's user id (Supabase's), not the backend id the screens
 * hold: every reader lands on the same entry. `enabled` is the reader's own
 * gate; the key is shared.
 */
export function useMeQuery<T>(enabled: boolean, select: (entry: MeEntry) => T) {
  const session = useSession();
  const userId = session.status === 'present' ? session.userId : null;
  return useQuery({
    queryKey: keys.viewer.me(userId ?? 'none'),
    queryFn: fetchMe,
    enabled,
    staleTime: 60_000,
    select,
  });
}

/**
 * A slice of /me for a screen's own read: `null` data means no account, which
 * the screen shows as its error. Error before content: a failed refetch of a
 * loaded slice keeps it; unknown is loading, never empty.
 */
export function useMeSlice<T>(enabled: boolean, select: (entry: MeRead) => T) {
  // Stable while `select` is: the slice is recomputed only when /me changes.
  const pick = useCallback((e: MeEntry) => (isMeRead(e) ? select(e) : null), [select]);
  const query = useMeQuery(enabled, pick);
  const status: 'loading' | 'error' | 'ready' = query.data
    ? 'ready'
    : query.error || query.data === null
      ? 'error'
      : 'loading';
  return {
    data: query.data ?? null,
    status,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}

/** Writes over every cached /me (every user id this tab has read it for). */
export function updateMe(qc: QueryClient, fn: (r: MeRead) => MeRead) {
  qc.setQueriesData<MeEntry>({ queryKey: keys.viewer.meAll }, (e) => (isMeRead(e) ? fn(e) : e));
}

/** Settings' read of /me, as the viewer's latest save left it until /me is read again. */
export function patchProfile(qc: QueryClient, patch: ProfilePatch) {
  updateMe(qc, (r) => ({ ...r, profile: { ...r.profile, ...patch } }));
}
