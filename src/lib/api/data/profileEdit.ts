'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

export type IntroEdit = { firstName: string; lastName: string; headline: string };
type IntroField = keyof IntroEdit;
export type IntroEditErrors = Partial<Record<IntroField | 'general', string>>;

const FIELD: Record<string, IntroField | 'about'> = {
  '/first_name': 'firstName',
  '/last_name': 'lastName',
  '/headline': 'headline',
  '/about_me': 'about',
};
const COPY: Record<IntroField | 'about', string> = {
  firstName: 'Add your first name.',
  lastName: 'Your last name can’t be empty.',
  headline: 'Keep your headline under 300 characters.',
  about: 'That About couldn’t be saved. Shorten it and try again.',
};

/** A failure as the forms show it: our copy per field, else one general line. */
export class EditError extends Error {
  constructor(readonly errors: IntroEditErrors & { about?: string }) {
    super('edit failed');
  }
}

function toEditError(error: unknown, body: unknown): EditError {
  if (error instanceof ApiError && error.status === 422) {
    const out: IntroEditErrors & { about?: string } = {};
    const list = (body as { errors?: unknown } | null)?.errors;
    if (Array.isArray(list))
      for (const it of list) {
        const f = FIELD[(it as { pointer?: unknown })?.pointer as string];
        if (f && !out[f]) out[f] = COPY[f];
      }
    if (Object.keys(out).length) return new EditError(out);
  }
  const e = normaliseError(error);
  return new EditError({
    general:
      e.kind === 'offline'
        ? 'You’re offline. Your changes are still here; try again when you’re connected.'
        : 'That didn’t save. Try again.',
  });
}

/** What can be caught before sending: a name can't be emptied. */
export function introProblems(before: IntroEdit, after: IntroEdit): IntroEditErrors {
  const out: IntroEditErrors = {};
  if (!after.firstName.trim()) out.firstName = COPY.firstName;
  if (!after.lastName.trim() && before.lastName.trim()) out.lastName = COPY.lastName;
  return out;
}

/**
 * The owner's name, headline and About (Mentor Profile.dc.html owner edit).
 * Names and About: PATCH /users/{id}/profile; headline: PATCH
 * /users/{id}/mentor-profile. Both are partial: only what changed is sent.
 * Not optimistic: the form shows "Saving…", then the profile (and anything
 * listing this mentor) refetches. Offline fails at once.
 */
export function useProfileEdit(userId: string | null) {
  const qc = useQueryClient();
  // Anything listing this mentor, and the viewer's own name in the shell.
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.mentors.all }),
      qc.invalidateQueries({ queryKey: keys.viewer.all }),
    ]);

  const intro = useMutation<void, EditError, { before: IntroEdit; after: IntroEdit }>({
    networkMode: 'always',
    mutationFn: async ({ before, after }) => {
      if (!userId) throw new EditError({ general: 'That didn’t save. Try again.' });
      const early = introProblems(before, after);
      if (Object.keys(early).length) throw new EditError(early);
      const first = after.firstName.trim();
      const last = after.lastName.trim();
      const headline = after.headline.trim();
      const names = {
        ...(first !== before.firstName.trim() && { first_name: first }),
        ...(last && last !== before.lastName.trim() && { last_name: last }),
      };
      try {
        if (Object.keys(names).length) {
          const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
            params: { path: { user_id: userId } },
            body: names,
          });
          if (!response.ok) throw toEditError(apiError(response.status, error), error);
        }
        if (headline !== before.headline.trim()) {
          const { error, response } = await api.PATCH('/api/v1/users/{user_id}/mentor-profile', {
            params: { path: { user_id: userId } },
            // Blank clears it (the server takes null or "").
            body: { headline: headline || null },
          });
          if (!response.ok) throw toEditError(apiError(response.status, error), error);
        }
      } catch (e) {
        throw e instanceof EditError ? e : toEditError(e, null);
      }
    },
    // Whatever landed (the names can save before the headline fails) shows.
    onSettled: () => void refresh(),
  });

  const about = useMutation<void, EditError, string>({
    networkMode: 'always',
    mutationFn: async (text) => {
      if (!userId) throw new EditError({ general: 'That didn’t save. Try again.' });
      try {
        const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
          params: { path: { user_id: userId } },
          // Blank clears it (the server treats blank as null).
          body: { about_me: text.trim() || null },
        });
        if (!response.ok) throw toEditError(apiError(response.status, error), error);
      } catch (e) {
        throw e instanceof EditError ? e : toEditError(e, null);
      }
    },
    onSuccess: () => void refresh(),
  });

  return {
    saveIntro: (before: IntroEdit, after: IntroEdit, done: () => void) =>
      intro.mutate({ before, after }, { onSuccess: done }),
    introSaving: intro.isPending,
    introErrors: intro.error?.errors ?? {},
    resetIntro: () => intro.reset(),
    saveAbout: (text: string, done: () => void) => about.mutate(text, { onSuccess: done }),
    aboutSaving: about.isPending,
    aboutError: about.error
      ? (about.error.errors.about ?? about.error.errors.general ?? null)
      : null,
    resetAbout: () => about.reset(),
  };
}
