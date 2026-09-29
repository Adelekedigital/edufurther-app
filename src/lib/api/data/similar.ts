'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote, SimilarMentor } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { toMentor } from './mentors';
import { sessionKey, useSession } from './session';

type SimilarMentorRead = components['schemas']['SimilarMentorRead'];

/** Mentor Profile.dc.html draws three. */
export const SIMILAR_SHOWN = 3;

/** The card-shaped mentor plus the design's row extras. Same rules as Explore's cards. */
export function toSimilarMentor(r: SimilarMentorRead): SimilarMentor {
  return {
    mentor: toMentor(r),
    // "MA, Leipzig University": the degree and the school, not the course.
    meta: [r.degree?.trim(), r.institution?.trim()].filter(Boolean).join(', ') || null,
    sharedTopic: r.shared_offering.display_name,
  };
}

/**
 * GET /api/v1/mentors/{handle}/similar. A suggestion, not the page's content:
 * the caller hides the card when this is empty or fails.
 */
export function useSimilarMentors(handle: string, enabled: boolean): Remote<SimilarMentor[]> {
  const session = useSession();
  const query = useQuery({
    // Signed-in lists leave the viewer out, so the key carries who is looking.
    queryKey: keys.mentors.similar(handle, sessionKey(session)),
    enabled: enabled && session.status !== 'unknown',
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/mentors/{handle}/similar', {
        params: { path: { handle } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.data.slice(0, SIMILAR_SHOWN).map(toSimilarMentor);
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
