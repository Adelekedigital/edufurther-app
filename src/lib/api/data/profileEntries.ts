'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { degreeFromSaved, yearToDate } from '@/lib/utils/degrees';
import type { AwardValues, EducationEntry, EducationValues } from '@/types/mentor';
import { ApiError, apiError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { generalCopy, ItemSaveError } from './profileItems';

const removeCopy = (e: unknown) =>
  /offline/.test(generalCopy(e))
    ? 'You’re offline. Try deleting it again when you’re connected.'
    : 'We couldn’t delete it. Try again.';

type AwardSave =
  | { op: 'add'; values: AwardValues }
  | { op: 'edit'; id: string; before: AwardValues; after: AwardValues }
  | { op: 'remove'; id: string };

/** Only the fields that changed; funding null clears it (backend AwardPatch). */
function awardPatch(before: AwardValues, after: AwardValues) {
  return {
    ...(after.title !== before.title && { title: after.title }),
    ...(after.org !== before.org && { institution: after.org }),
    ...(after.year !== before.year && { year: after.year }),
    ...(after.funding !== before.funding && { funding: after.funding }),
  };
}

// ---- awards ----------------------------------------------------------------

/**
 * The owner's scholarships and awards (ProfileItemModal.dc.html `award`):
 * POST /users/{id}/awards, PATCH and DELETE /users/{id}/awards/{award_id}.
 * Not optimistic, like the other profile editors: the modal closes once the
 * profile has refetched, onto the new list.
 */
export function useAwardEdit(userId: string | null) {
  const qc = useQueryClient();
  const m = useMutation<void, ItemSaveError, AwardSave>({
    networkMode: 'always',
    mutationFn: async (save) => {
      if (!userId) throw new ItemSaveError(generalCopy(null));
      try {
        const res =
          save.op === 'add'
            ? await api.POST('/api/v1/users/{user_id}/awards', {
                params: { path: { user_id: userId } },
                body: {
                  title: save.values.title,
                  institution: save.values.org,
                  year: save.values.year,
                  funding: save.values.funding,
                },
              })
            : save.op === 'edit'
              ? await api.PATCH('/api/v1/users/{user_id}/awards/{award_id}', {
                  params: { path: { user_id: userId, award_id: save.id } },
                  body: awardPatch(save.before, save.after),
                })
              : await api.DELETE('/api/v1/users/{user_id}/awards/{award_id}', {
                  params: { path: { user_id: userId, award_id: save.id } },
                });
        // Removing one that's already gone is what was asked for.
        if (!res.response.ok && !(save.op === 'remove' && res.response.status === 404))
          throw apiError(res.response.status, res.error);
      } catch (e) {
        if (e instanceof ItemSaveError) throw e;
        throw new ItemSaveError(save.op === 'remove' ? removeCopy(e) : generalCopy(e));
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.mentors.all }),
  });
  const run = (save: AwardSave, done: () => void) => m.mutate(save, { onSuccess: done });
  return {
    addAward: (values: AwardValues, done: () => void) => run({ op: 'add', values }, done),
    editAward: (id: string, before: AwardValues, after: AwardValues, done: () => void) =>
      run({ op: 'edit', id, before, after }, done),
    removeAward: (id: string, done: () => void) => run({ op: 'remove', id }, done),
    saving: m.isPending && m.variables?.op !== 'remove',
    removing: m.isPending && m.variables?.op === 'remove',
    error: m.error?.copy ?? null,
    reset: () => m.reset(),
  };
}

// ---- education -------------------------------------------------------------

/**
 * The owner's own degrees, as saved (GET /users/{id}/education, backend
 * reply): the public profile doesn't carry what the form needs (the current
 * flag, the level, the raw school name). Fetched while the editor is open.
 */
export function useOwnEducation(userId: string | null, enabled: boolean) {
  const query = useQuery({
    queryKey: keys.education(userId ?? ''),
    queryFn: async ({ signal }): Promise<EducationEntry[]> => {
      const { data, response } = await api.GET('/api/v1/users/{user_id}/education', {
        params: { path: { user_id: userId! } },
        signal,
      });
      if (!data) throw new ApiError(response.status);
      return data.data.map((e) => ({
        id: e.id,
        values: {
          school: e.school_name_raw,
          degree: degreeFromSaved(e.degree_abbreviation),
          course: e.study_course ?? '',
          start: Number(e.date_start?.slice(0, 4)) || new Date().getFullYear(),
          // No end saved: its start (not today), so nothing new is sent unless changed.
          end:
            Number(e.date_end?.slice(0, 4)) ||
            Number(e.date_start?.slice(0, 4)) ||
            new Date().getFullYear(),
          current: e.is_most_recent,
        },
        dateStart: e.date_start ?? null,
        dateEnd: e.date_end ?? null,
        levelId: e.degree_level?.id ?? null,
      }));
    },
    enabled: enabled && !!userId,
  });
  const status = query.data ? 'ready' : query.error ? 'error' : 'loading';
  return {
    entries: query.data ?? [],
    status: status as 'ready' | 'error' | 'loading',
    retry: () => void query.refetch(),
  };
}

type EducationSave =
  | { op: 'add'; body: EducationBody }
  | { op: 'edit'; id: string; body: Partial<EducationBody> }
  | { op: 'remove'; id: string };

export type EducationBody = {
  school_name_raw: string;
  degree_abbreviation: string | null;
  degree_level_id: string | null;
  study_course: string;
  date_start: string;
  date_end: string;
  is_most_recent: boolean;
};

/**
 * The body a degree saves as. `levelId`: the catalog id for the degree's
 * level (null for Other). An edit sends only what changed.
 */
export function educationBody(
  v: EducationValues,
  levelId: string | null,
  saved?: EducationEntry,
): EducationBody {
  return {
    school_name_raw: v.school,
    degree_abbreviation: v.degree === 'Other' ? null : v.degree,
    degree_level_id: levelId,
    study_course: v.course,
    date_start: yearToDate(v.start, saved?.dateStart ?? null),
    date_end: yearToDate(v.end, saved?.dateEnd ?? null),
    is_most_recent: v.current,
  };
}

export function educationPatch(before: EducationBody, after: EducationBody) {
  return Object.fromEntries(
    (Object.keys(after) as (keyof EducationBody)[])
      .filter((k) => after[k] !== before[k])
      .map((k) => [k, after[k]]),
  ) as Partial<EducationBody>;
}

/**
 * The owner's degrees (ProfileItemModal.dc.html `education`): POST
 * /users/{id}/education, PATCH and DELETE /users/{id}/education/{entry_id}.
 * Not optimistic; the profile and the owner's list refetch before it closes.
 */
export function useEducationEdit(userId: string | null) {
  const qc = useQueryClient();
  const m = useMutation<void, ItemSaveError, EducationSave>({
    networkMode: 'always',
    mutationFn: async (save) => {
      if (!userId) throw new ItemSaveError(generalCopy(null));
      try {
        const path = { user_id: userId };
        const res =
          save.op === 'add'
            ? await api.POST('/api/v1/users/{user_id}/education', {
                params: { path },
                body: save.body,
              })
            : save.op === 'edit'
              ? await api.PATCH('/api/v1/users/{user_id}/education/{entry_id}', {
                  params: { path: { ...path, entry_id: save.id } },
                  body: save.body,
                })
              : await api.DELETE('/api/v1/users/{user_id}/education/{entry_id}', {
                  params: { path: { ...path, entry_id: save.id } },
                });
        if (!res.response.ok && !(save.op === 'remove' && res.response.status === 404))
          throw apiError(res.response.status, res.error);
      } catch (e) {
        if (e instanceof ItemSaveError) throw e;
        throw new ItemSaveError(save.op === 'remove' ? removeCopy(e) : generalCopy(e));
      }
    },
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.mentors.all }),
        userId && qc.invalidateQueries({ queryKey: keys.education(userId) }),
      ]),
  });
  const run = (save: EducationSave, done: () => void) => m.mutate(save, { onSuccess: done });
  return {
    addEducation: (body: EducationBody, done: () => void) => run({ op: 'add', body }, done),
    editEducation: (id: string, body: Partial<EducationBody>, done: () => void) =>
      run({ op: 'edit', id, body }, done),
    removeEducation: (id: string, done: () => void) => run({ op: 'remove', id }, done),
    saving: m.isPending && m.variables?.op !== 'remove',
    removing: m.isPending && m.variables?.op === 'remove',
    error: m.error?.copy ?? null,
    reset: () => m.reset(),
  };
}
