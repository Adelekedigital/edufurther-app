'use client';

import type { components } from '@/lib/api/generated/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { INTRO_ERRORS } from '@/lib/copy/profile';
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
  firstName: INTRO_ERRORS.firstName,
  lastName: INTRO_ERRORS.lastName,
  headline: 'Keep your headline under 300 characters.',
  about: 'That About couldn’t be saved. Shorten it and try again.',
};

/** A failure as the forms show it: our copy per field, else one general line. */
export class EditError extends Error {
  /** `cause`: the failure itself, so the review freeze's refusal is still seen (freeze.ts). */
  constructor(
    readonly errors: IntroEditErrors & { about?: string },
    cause?: unknown,
  ) {
    super('edit failed', { cause });
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
    if (Object.keys(out).length) return new EditError(out, error);
  }
  const e = normaliseError(error);
  // Refused for the review: the page freezes and its bar says why, so no
  // "try again" here (it can't succeed until the decision).
  if (e.kind === 'inReview') return new EditError({}, error);
  return new EditError(
    {
      general:
        e.kind === 'offline'
          ? 'You’re offline. Your changes are still here; try again when you’re connected.'
          : 'That didn’t save. Try again.',
    },
    error,
  );
}

/** The general line when the names saved but the headline didn't. */
function partialCopy(general: string): string {
  return /offline/i.test(general)
    ? 'Your name saved. The headline didn’t: you’re offline. Try again when you’re connected.'
    : 'Your name saved. The headline didn’t: try again.';
}

/** What can be caught before sending: both names are required (the form rule). */
export function introProblems(after: IntroEdit): IntroEditErrors {
  const out: IntroEditErrors = {};
  if (!after.firstName.trim()) out.firstName = COPY.firstName;
  if (!after.lastName.trim()) out.lastName = COPY.lastName;
  return out;
}

/**
 * The owner's name, headline and About (Mentor Profile.dc.html owner edit).
 * Names and About: PATCH /users/{id}/profile; headline: PATCH
 * /users/{id}/mentor-profile. Both are partial: only what changed is sent.
 * Not optimistic: "Saving…" lasts until the profile (and anything listing
 * this mentor) has refetched, so the form closes onto the new values, never
 * a flash of the old ones (review of #78). Offline fails at once.
 */
/** Whether the saved About is still an untouched AI draft (PRD B7). */
export type AboutProvenance = { drafted: boolean; promptVersion: string | null };

type AboutWrite = Pick<
  components['schemas']['UserProfileWrite'],
  'about_me_drafted' | 'about_me_prompt_version'
>;

/**
 * The About PATCH (backend #8). Blank clears it (the server treats blank as
 * null). With provenance: true stamps the draft with its prompt version (the
 * server sets the time); false alone clears the record. Still drafted but
 * with no version (a draft saved earlier, untouched now) sends neither, so
 * what the server holds stays as it is.
 */

export function aboutBody(text: string, provenance?: AboutProvenance) {
  const keep = provenance?.drafted && !provenance.promptVersion;
  // The published contract: drafted:true carries its version (the server
  // stamps the time); drafted:false alone clears both. A version without
  // drafted:true is refused, so it's never sent to clear.
  const stamp: AboutWrite =
    !provenance || keep
      ? {}
      : provenance.drafted && provenance.promptVersion
        ? { about_me_drafted: true, about_me_prompt_version: provenance.promptVersion }
        : { about_me_drafted: false };
  return { about_me: text.trim() || null, ...stamp };
}

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
      const early = introProblems(after);
      if (Object.keys(early).length) throw new EditError(early);
      const first = after.firstName.trim();
      const last = after.lastName.trim();
      const headline = after.headline.trim();
      const names = {
        ...(first !== before.firstName.trim() && { first_name: first }),
        ...(last !== before.lastName.trim() && { last_name: last }),
      };
      let namesSaved = false;
      try {
        if (Object.keys(names).length) {
          const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
            params: { path: { user_id: userId } },
            body: names,
          });
          if (!response.ok) throw toEditError(apiError(response.status, error), error);
          namesSaved = true;
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
        const err = e instanceof EditError ? e : toEditError(e, null);
        // The names landed and the headline didn't: say so, not "didn't save".
        if (namesSaved && err.errors.general)
          throw new EditError(
            { ...err.errors, general: partialCopy(err.errors.general) },
            err.cause,
          );
        throw err;
      }
    },
    // Whatever landed (the names can save before the headline fails) shows;
    // returned, so the save waits for it.
    onSettled: () => refresh(),
  });

  const about = useMutation<void, EditError, { text: string; provenance?: AboutProvenance }>({
    networkMode: 'always',
    mutationFn: async ({ text, provenance }) => {
      if (!userId) throw new EditError({ general: 'That didn’t save. Try again.' });
      try {
        const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
          params: { path: { user_id: userId } },
          body: aboutBody(text, provenance),
        });
        if (!response.ok) throw toEditError(apiError(response.status, error), error);
      } catch (e) {
        throw e instanceof EditError ? e : toEditError(e, null);
      }
    },
    onSuccess: () => refresh(),
  });

  return {
    saveIntro: (before: IntroEdit, after: IntroEdit, done: () => void) =>
      intro.mutate({ before, after }, { onSuccess: done }),
    introSaving: intro.isPending,
    introErrors: intro.error?.errors ?? {},
    resetIntro: () => intro.reset(),
    saveAbout: (text: string, done: () => void, provenance?: AboutProvenance) =>
      about.mutate({ text, provenance }, { onSuccess: done }),
    aboutSaving: about.isPending,
    aboutError: about.error
      ? (about.error.errors.about ?? about.error.errors.general ?? null)
      : null,
    resetAbout: () => about.reset(),
  };
}
