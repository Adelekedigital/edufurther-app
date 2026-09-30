'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

export type BackgroundSave = { originId: string; studyId: string; languageIds: string[] };

/** A failed save, in our words. */
export class ItemSaveError extends Error {
  constructor(readonly copy: string) {
    super('item save failed');
  }
}

const offline = (e: unknown) => normaliseError(e).kind === 'offline';
const generalCopy = (e: unknown) =>
  offline(e)
    ? 'You’re offline. Your changes are still here; try again when you’re connected.'
    : 'That didn’t save. Try again.';

const PARTS = {
  origin: 'where you’re from',
  study: 'where you studied',
  languages: 'your languages',
} as const;
type Part = keyof typeof PARTS;
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** "Where you’re from saved. Your languages didn’t: try again." */
export function partialCopy(saved: Part[], failed: Part, e: unknown): string {
  const done = saved.map((p) => PARTS[p]).join(' and ');
  const why = offline(e) ? 'you’re offline. Try again when you’re connected.' : 'try again.';
  return `${cap(done)} saved. ${cap(PARTS[failed])} didn’t: ${why}`;
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * The owner's topics and background (ProfileItemModal.dc.html). Topics:
 * PATCH /users/{id}/mentor-profile `offering_ids`. Background: up to three
 * writes, only what changed — origin (PATCH /profile), where they studied
 * (PATCH /mentor-profile), languages (PUT /languages, the whole list; only
 * `language_id` is sent, so each language keeps its proficiency and primary
 * flag, backend reply). A save that lands partly says which part didn't.
 * Not optimistic, like the intro: "Saving…" lasts until the profile refetched.
 */
export function useProfileItems(userId: string | null) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.mentors.all });

  const topics = useMutation<void, ItemSaveError, string[]>({
    networkMode: 'always',
    mutationFn: async (ids) => {
      if (!userId) throw new ItemSaveError(generalCopy(null));
      try {
        const { error, response } = await api.PATCH('/api/v1/users/{user_id}/mentor-profile', {
          params: { path: { user_id: userId } },
          body: { offering_ids: ids },
        });
        if (!response.ok) throw apiError(response.status, error);
      } catch (e) {
        throw new ItemSaveError(generalCopy(e));
      }
    },
    onSettled: () => refresh(),
  });

  const background = useMutation<
    void,
    ItemSaveError,
    { before: BackgroundSave; after: BackgroundSave; all?: boolean }
  >({
    networkMode: 'always',
    mutationFn: async ({ before, after, all }) => {
      if (!userId) throw new ItemSaveError(generalCopy(null));
      const path = { params: { path: { user_id: userId } } };
      const steps: [Part, () => Promise<{ error?: unknown; response: Response }>][] = [];
      if (all || after.originId !== before.originId)
        steps.push([
          'origin',
          () =>
            api.PATCH('/api/v1/users/{user_id}/profile', {
              ...path,
              body: { origin_country_id: after.originId || null },
            }),
        ]);
      if (all || after.studyId !== before.studyId)
        steps.push([
          'study',
          () =>
            api.PATCH('/api/v1/users/{user_id}/mentor-profile', {
              ...path,
              body: { primary_study_country_id: after.studyId || null },
            }),
        ]);
      if (all || !sameList(after.languageIds, before.languageIds))
        steps.push([
          'languages',
          () =>
            api.PUT('/api/v1/users/{user_id}/languages', {
              ...path,
              body: { languages: after.languageIds.map((id) => ({ language_id: id })) },
            }),
        ]);
      const saved: Part[] = [];
      for (const [part, run] of steps) {
        try {
          const { error, response } = await run();
          if (!response.ok) throw apiError(response.status, error);
        } catch (e) {
          throw new ItemSaveError(saved.length ? partialCopy(saved, part, e) : generalCopy(e));
        }
        saved.push(part);
      }
    },
    // Whatever landed shows; returned, so the save waits for it.
    onSettled: () => refresh(),
  });

  return {
    saveTopics: (ids: string[], done: () => void) => topics.mutate(ids, { onSuccess: done }),
    topicsSaving: topics.isPending,
    topicsError: topics.error?.copy ?? null,
    resetTopics: () => topics.reset(),
    /**
     * `all`: send every part, not just the diff — after a partial failure the
     * server's state isn't the opened-with one (review of #85).
     */
    saveBackground: (
      before: BackgroundSave,
      after: BackgroundSave,
      done: () => void,
      opts: { all?: boolean } = {},
    ) => background.mutate({ before, after, all: opts.all }, { onSuccess: done }),
    backgroundSaving: background.isPending,
    backgroundError: background.error?.copy ?? null,
    resetBackground: () => background.reset(),
  };
}
