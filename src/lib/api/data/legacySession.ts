'use client';

import { useQuery } from '@tanstack/react-query';
import type { Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

/**
 * An old app session link (`/profile/?r=yes&sessId={legacy id}`, in legacy
 * emails and video-room links) → this app's session id. Signed in only: the
 * backend answers 404 alike for an unknown id and for someone else's session,
 * so a session's existence is never revealed (backend PR 738).
 */
export function useLegacySession(legacyId: string | null): Remote<string> {
  const session = useSession();
  const enabled = !!legacyId && session.status === 'present';
  const query = useQuery({
    queryKey: keys.bookings.legacy(sessionKey(session), legacyId ?? ''),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/legacy-sessions/{legacy_id}', {
        params: { path: { legacy_id: legacyId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.session_id;
    },
    staleTime: Infinity,
    retry: false,
  });
  // Signed out here (the session lapsed after the proxy let the page through):
  // say so, so the page can send them to log in rather than wait forever.
  const signedOut = session.status === 'none';
  return {
    data: query.data ?? null,
    isLoading: enabled ? query.isPending : session.status === 'unknown',
    error: signedOut
      ? { kind: 'unauthorized', message: 'Log in to open this session.' }
      : query.error
        ? normaliseError(query.error)
        : null,
    retry: () => void query.refetch(),
  };
}
