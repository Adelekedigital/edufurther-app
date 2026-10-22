'use client';

import { useQuery } from '@tanstack/react-query';
import type { Mentor, Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { toMentor } from './mentors';
import { sessionKey, useSession } from './session';

/** "Mentors mentees are booking this week" (Mentor Profile.dc.html notFound): four cards. */
export const FREE_SOON = { days: 7, shown: 4 } as const;

/**
 * GET /api/v1/mentors?available_within_days=7 (backend #521): mentors with a
 * free time the backend vouches for in the next week, so the design's "All
 * have open times in the next 7 days" holds. A suggestion: the caller falls
 * back when it's empty or fails.
 */
export function useMentorsFreeSoon(enabled: boolean): Remote<Mentor[]> {
  const session = useSession();
  const query = useQuery({
    // Signed-in lists leave the viewer out, so the key carries who is looking.
    queryKey: keys.mentors.freeSoon(FREE_SOON.days, sessionKey(session)),
    enabled: enabled && session.status !== 'unknown',
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/mentors', {
        params: { query: { available_within_days: FREE_SOON.days, limit: FREE_SOON.shown } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.data.map(toMentor);
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
