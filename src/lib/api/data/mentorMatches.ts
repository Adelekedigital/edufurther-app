'use client';

import { useQuery } from '@tanstack/react-query';
import type { Topic } from '@/types/mentor';
import type { MatchBasis, MatchReason, MentorMatch } from '@/types/onboarding';
import type { components } from '@/lib/api/generated/schema';
import { ApiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { toMentor } from './mentors';

/** `GET /me/mentor-matches` as the spec publishes it (backend #4). */
export type WireMatches = components['schemas']['MentorMatchesRead'];
type WireReason = WireMatches['matches'][number]['reasons'][number];

/** Reason codes the frontend words; an unknown code from a later backend is skipped. */
function toReason(r: WireReason, topics: Topic[]): MatchReason | null {
  switch (r.code) {
    case 'study_country':
    case 'origin':
      return { code: r.code, country: r.country };
    case 'degree':
      return { code: 'degree', level: r.level.label };
    case 'help_areas':
      return {
        code: 'help_areas',
        slugs: r.offering_ids.flatMap((id) => topics.find((t) => t.id === id)?.slug ?? []),
      };
    case 'field':
      return { code: 'field', field: r.field };
    default:
      // A later backend may add codes the published union doesn't list yet: skipped.
      return null;
  }
}

export type Matches = {
  matches: MentorMatch[];
  exact: boolean;
  basis: MatchBasis;
  forMentorBookable: boolean;
};

export function toMatches(w: WireMatches, topics: Topic[]): Matches {
  const b = w.based_on;
  return {
    matches: w.matches.map((m) => ({
      mentor: toMentor(m.mentor),
      reasons: m.reasons.flatMap((r) => toReason(r, topics) ?? []),
      // Refs ({id, label}): the label is what the "{level} · {country}" line shows.
      level: m.level?.label ?? null,
      studyCountry: m.study_country?.label ?? m.mentor.primary_study_country ?? null,
    })),
    exact: w.exact,
    basis: {
      // As the mentee chose it: "MBA", not the stored Master's.
      degree: b.degree?.raw || b.degree?.label || null,
      field: b.field ?? null,
      country: b.country?.label ?? null,
      origin: b.origin?.label ?? null,
    },
    forMentorBookable: w.for_mentor_bookable !== false,
  };
}

/**
 * The mentee's top matches (PRD B4), ranked by the backend's one rule. `topics`
 * (the offering catalog) turns help-area ids into the slugs the copy is keyed by.
 */
export function useMentorMatches(
  userId: string | null,
  topics: Topic[],
  { enabled, forMentor = null }: { enabled: boolean; forMentor?: string | null },
) {
  const query = useQuery({
    queryKey: keys.onboarding.matches(userId ?? 'none', forMentor ?? ''),
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET('/api/v1/me/mentor-matches', {
        params: { query: { limit: 2, ...(forMentor ? { for_mentor: forMentor } : {}) } },
        signal,
      });
      if (!response.ok || !data) throw new ApiError(response.status);
      return data;
    },
    enabled: enabled && userId !== null,
    retry: retryOnce,
  });
  return {
    data: query.data ? toMatches(query.data, topics) : null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
