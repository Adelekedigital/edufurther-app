'use client';

import { useQuery } from '@tanstack/react-query';
import type { Topic } from '@/types/mentor';
import type { MatchBasis, MatchReason, MentorMatch } from '@/types/onboarding';
import type { components } from '@/lib/api/generated/schema';
import { DEGREE_OPTIONS } from '@/lib/copy/onboarding';
import { ApiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { toMentor } from './mentors';

/** `GET /me/mentor-matches` as the spec publishes it (backend #4). */
export type WireMatches = components['schemas']['MentorMatchesRead'];
type WireReason = WireMatches['matches'][number]['reasons'][number];

/** The degree catalogue as the matches read it: the id → its stable code. */
export type LevelCodes = { id: string; code: string }[];

/**
 * A level as our own words say it ("Master’s", "PhD"), found by its catalogue
 * code; the backend's display name ("Master’s Degree") only when the code is
 * unknown (owner, 2026-10-17: the basis line read "Master’s Degree Public Health").
 */
function levelWord(
  ref: { id?: string | null; label?: string | null } | null | undefined,
  levels: LevelCodes,
): string | null {
  if (!ref) return null;
  const code = levels.find((l) => l.id === ref.id)?.code;
  return DEGREE_OPTIONS.find((d) => d.code === code && d.raw === null)?.label ?? ref.label ?? null;
}

/** Reason codes the frontend words; an unknown code from a later backend is skipped. */
function toReason(r: WireReason, topics: Topic[], levels: LevelCodes): MatchReason | null {
  switch (r.code) {
    case 'study_country':
    case 'origin':
      return { code: r.code, country: r.country };
    case 'degree':
      return { code: 'degree', level: levelWord(r.level, levels) ?? '' };
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

export function toMatches(w: WireMatches, topics: Topic[], levels: LevelCodes = []): Matches {
  const b = w.based_on;
  return {
    matches: w.matches.map((m) => ({
      mentor: toMentor(m.mentor),
      reasons: m.reasons.flatMap((r) => toReason(r, topics, levels) ?? []),
      // Refs ({id, label}): the label is what the "{level} · {country}" line shows.
      level: levelWord(m.level, levels),
      studyCountry: m.study_country?.label ?? m.mentor.primary_study_country ?? null,
    })),
    exact: w.exact,
    basis: {
      // As the mentee chose it: "MBA", not the stored Master's.
      degree: b.degree?.raw || levelWord(b.degree, levels),
      field: b.field ?? null,
      country: b.country?.label ?? null,
      origin: b.origin?.label ?? null,
    },
    forMentorBookable: w.for_mentor_bookable !== false,
  };
}

/**
 * The mentee's top matches (PRD B4), ranked by the backend's one rule: 2 for
 * onboarding; Home asks for 3 it hasn't met (`excludeMet`). `topics`
 * (the offering catalog) turns help-area ids into the slugs the copy is keyed by.
 */
export function useMentorMatches(
  userId: string | null,
  topics: Topic[],
  levels: LevelCodes,
  {
    enabled,
    forMentor = null,
    limit = 2,
    excludeMet = false,
  }: {
    enabled: boolean;
    forMentor?: string | null;
    limit?: number;
    /** Leave out mentors already met (backend #550); `limit` then counts only the rest. */
    excludeMet?: boolean;
  },
) {
  const query = useQuery({
    queryKey: keys.onboarding.matches(userId ?? 'none', forMentor ?? '', limit, excludeMet),
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET('/api/v1/me/mentor-matches', {
        params: {
          query: {
            limit,
            ...(forMentor ? { for_mentor: forMentor } : {}),
            ...(excludeMet ? { exclude_met: true } : {}),
          },
        },
        signal,
      });
      if (!response.ok || !data) throw new ApiError(response.status);
      return data;
    },
    enabled: enabled && userId !== null,
    retry: retryOnce,
  });
  return {
    data: query.data ? toMatches(query.data, topics, levels) : null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
