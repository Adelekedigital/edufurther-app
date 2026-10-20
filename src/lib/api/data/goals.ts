'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GOALS_COPY } from '@/lib/copy/settings';
import type { components } from '@/lib/api/generated/schema';
import type { GoalSchool, MenteeGoalValues } from '@/types/settings';
import type { CatalogOption } from './catalog';
import { apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { degreeValue, degreeWrite, putGoal } from './onboarding';

type GoalRead = components['schemas']['GoalRead'];
type GoalWrite = components['schemas']['GoalWrite'];

/** What Settings › Goals reads from GET /me. Countries come as ISO codes, not ids. */
export type GoalsRead = {
  goal: GoalRead | null;
  originCode: string | null;
  /** Where they live now: the prefill for an empty "Where you’re from" (PRD S7). */
  currentCode: string | null;
};

const idByCode = (countries: CatalogOption[], code: string | null | undefined) =>
  (code && countries.find((c) => c.code === code)?.id) || '';

/**
 * The read as the form holds it. `countries` maps the codes back to catalogue
 * ids. Not carried: a goal country the catalogue doesn't list, or a degree
 * that isn't one of the four choices; saving from Settings drops them.
 */
export function toGoalValues(read: GoalsRead, countries: CatalogOption[]): MenteeGoalValues {
  const g = read.goal;
  const schools: GoalSchool[] = [...(g?.schools ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      institutionId: s.institution_id ?? null,
      raw: s.school_name_raw,
      label: s.institution_name || s.school_name_raw,
    }));
  return {
    originId: idByCode(countries, read.originCode) || idByCode(countries, read.currentCode),
    degree: degreeValue(g),
    field: g?.field_of_study ?? '',
    countryIds: [...(g?.countries ?? [])]
      .sort((a, b) => a.priority - b.priority)
      .flatMap((c) => idByCode(countries, c.code) || []),
    schools,
    needIds: (g?.needs ?? []).map((n) => n.id),
  };
}

/** The origin as saved (no prefill), so Save only writes it when it changes. */
export const savedOriginId = (read: GoalsRead, countries: CatalogOption[]) =>
  idByCode(countries, read.originCode);

/** The signed-in mentee's goal, where they're from and where they live. */
export function useMenteeGoals(userId: string | null) {
  const query = useQuery({
    queryKey: keys.viewer.goals(userId ?? 'none'),
    enabled: userId !== null,
    // Once: a failed load shows its error promptly (as Settings › Profile).
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<GoalsRead> => {
      const { data, error, response } = await api.GET('/api/v1/me', { signal });
      if (!data) throw apiError(response.status, error);
      return {
        goal: data.goal ?? null,
        originCode: data.profile?.origin_country?.code ?? null,
        currentCode: data.profile?.current_country?.code ?? null,
      };
    },
  });
  // Error before content: a failed refetch of a loaded goal keeps it.
  const status: 'loading' | 'error' | 'ready' = query.data
    ? 'ready'
    : query.error
      ? 'error'
      : 'loading';
  return {
    read: query.data ?? null,
    status,
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}

/** A failed save, in our words. */
export class GoalsSaveError extends Error {
  /** `originSaved`: where they're from landed before the goal failed. */
  constructor(
    readonly copy: string,
    readonly originSaved = false,
  ) {
    super('goals save failed');
  }
}

export type GoalsSave = {
  after: MenteeGoalValues;
  /** The origin as saved; the profile is written only when it differs. */
  savedOriginId: string;
  /** The saved goal, for what Settings doesn't ask (start term, notes). */
  goal: GoalRead | null;
  levels: { id: string; code: string }[];
};

/** The body for PUT /users/{id}/goal: the whole goal, since PUT replaces it. */
export function goalsBody({ after, goal, levels }: GoalsSave): GoalWrite {
  return {
    // Kept as they are: Settings doesn't ask these (goalsWhen=hide).
    target_start_term: goal?.target_start_term ?? null,
    notes: goal?.notes ?? null,
    ...degreeWrite(after.degree, levels),
    field_of_study: after.field.trim(),
    country_ids: after.countryIds,
    need_ids: after.needIds,
    schools: after.schools.map((s) => ({
      institution_id: s.institutionId,
      school_name_raw: s.raw,
    })),
  };
}

/**
 * Settings › Goals' Save (PRD): where they're from on the profile, then the
 * goal (PUT, the whole of it). Not optimistic: the form settles on what the
 * server holds once /me refetches. New answers, new ranking: the matches,
 * Explore's lists and Home's suggestions refresh.
 */
export function useSaveGoals(userId: string | null) {
  const qc = useQueryClient();
  return useMutation<void, GoalsSaveError, GoalsSave>({
    networkMode: 'always',
    mutationFn: async (save) => {
      if (!userId) throw new GoalsSaveError(GOALS_COPY.saveFailed);
      let originSaved = false;
      try {
        // Built first: a degree the catalogue can't place writes nothing at all.
        const body = goalsBody(save);
        if (save.after.originId !== save.savedOriginId) {
          const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
            params: { path: { user_id: userId } },
            body: { origin_country_id: save.after.originId },
          });
          if (!response.ok) throw apiError(response.status, error, response);
          originSaved = true;
        }
        await putGoal(userId, body);
      } catch {
        throw new GoalsSaveError(GOALS_COPY.saveFailed, originSaved);
      }
    },
    // Saving lasts until this tab's own read is back; the rest refresh behind it.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.onboarding.all });
      void qc.invalidateQueries({ queryKey: keys.mentors.listAll });
      void qc.invalidateQueries({ queryKey: keys.menteeHome.all });
      void qc.invalidateQueries({
        queryKey: keys.viewer.all,
        predicate: (q) => q.queryKey[1] !== 'goals',
      });
      return qc.invalidateQueries({ queryKey: keys.viewer.goals(userId ?? 'none') });
    },
  });
}
