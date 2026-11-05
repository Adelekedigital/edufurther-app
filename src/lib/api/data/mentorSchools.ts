'use client';

import { useQuery } from '@tanstack/react-query';
import type { Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { keys } from './keys';
import { untyped, type WireMentorSchools } from './pending';

/** The invite landing's strip (founder, 2 Nov): at most 5 schools. */
export const SCHOOLS_SHOWN = 5;
/** Fewer than this and the strip hides: a short list reads as a small platform. */
export const SCHOOLS_MIN = 4;

/**
 * The names to show, in the backend's order (most mentors first). The server
 * groups by name, so a name never repeats; an empty one is dropped.
 */
export function toSchoolNames(r: WireMentorSchools): string[] {
  return (r.data ?? []).map((row) => row?.name?.trim() ?? '').filter(Boolean);
}

/**
 * The top schools of bookable mentors (GET /mentor-schools, public, no
 * token; PENDING BACKEND, PRD Invite Landing PR 1). Not retried: the strip is
 * proof, not content, and simply hides on a failure.
 */
export function useMentorSchools(active = true, limit = SCHOOLS_SHOWN): Remote<string[]> {
  const query = useQuery({
    queryKey: keys.mentors.schools(limit),
    enabled: active,
    // The backend caches it for 10 minutes: the list changes slowly.
    staleTime: 10 * 60_000,
    networkMode: 'always',
    retry: false,
    queryFn: async ({ signal }): Promise<string[]> => {
      const { data, error, response } = await untyped.GET('/api/v1/mentor-schools', {
        params: { query: { limit } },
        signal,
      });
      if (!data) throw apiError(response.status, error, response);
      return toSchoolNames(data as WireMentorSchools);
    },
  });
  return {
    data: query.data ?? null,
    isLoading: active && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
