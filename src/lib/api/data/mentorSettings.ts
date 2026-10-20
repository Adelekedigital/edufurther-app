'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SAVE_COPY } from '@/lib/copy/settings';
import { MENTOR_EXPERTISE_COPY, MENTOR_PROFILE_COPY } from '@/lib/copy/mentorSettings';
import { tidyName } from '@/lib/utils/name';
import type { MentorProfileValues } from '@/types/mentorSettings';
import type { MentorProfile } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { useMentorProfile } from './profile';
import { aboutBody } from './profileEdit';

/** The headline's limit for a new or edited one (the API allows 300; PRD 19 Oct). */
export const HEADLINE_MAX = 80;

export type HeadlineProblem = 'required' | 'tooLong';

/**
 * Required; 80 at most once it's changed. An unchanged older headline that's
 * longer still saves (PRD update 19 Oct).
 */
export function headlineProblem(saved: string, now: string): HeadlineProblem | null {
  if (!now.trim()) return 'required';
  if (now !== saved && now.trim().length > HEADLINE_MAX) return 'tooLong';
  return null;
}

/** The form's values from the owner's own profile read, plus the gender /me holds. */
export function toMentorProfileValues(p: MentorProfile, gender: string): MentorProfileValues {
  return {
    name: [p.names.first, p.names.last].filter(Boolean).join(' '),
    headline: p.headline ?? '',
    about: p.about ?? '',
    aboutDrafted: p.aboutDrafted,
    originId: p.background.originId ?? '',
    studyId: p.background.studyId ?? '',
    gender,
    languages: p.background.languages,
  };
}

/**
 * Settings › Profile for a mentor: the handle and gender from /me, then the
 * owner's own profile read (names, headline, About, background, cover, photo
 * and the preview's proof line), the same one the profile page edits.
 */
export function useMentorSettings(userId: string | null) {
  const me = useQuery({
    queryKey: keys.viewer.mentorSettings(userId ?? 'none'),
    enabled: userId !== null,
    retry: retryOnce,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/me', { signal });
      if (!data) throw apiError(response.status, error);
      return { slug: data.slug ?? null, gender: data.profile?.gender ?? '' };
    },
  });
  const profile = useMentorProfile(me.data?.slug ?? null);
  const values =
    profile.data && me.data ? toMentorProfileValues(profile.data, me.data.gender) : null;
  // Error before content: a failed first read says so; a failed refetch keeps
  // what's shown. A /me with no handle has no profile to read: an error too.
  const noHandle = !!me.data && !me.data.slug;
  const failed =
    (!me.data && !!me.error) ||
    noHandle ||
    (!profile.data && (!!profile.error || profile.notFound));
  const status: 'loading' | 'error' | 'ready' = values ? 'ready' : failed ? 'error' : 'loading';
  return {
    status,
    values,
    profile: profile.data,
    slug: me.data?.slug ?? null,
    /** Moves each time either read lands, even with the same data. */
    version: `${me.dataUpdatedAt}:${profile.updatedAt}`,
    retry: () => {
      if (me.error || noHandle) void me.refetch();
      // Only with a handle: a disabled query's refetch would ask for /mentors/null.
      if (me.data?.slug) profile.retry();
    },
  };
}

/** The three writes one Save can make, in the order they're sent. */
type Part = 'details' | 'listing' | 'languages';

/** A failed save, in our words. `saved`: the parts that landed before it stopped. */
export class MentorProfileSaveError extends Error {
  constructor(
    readonly copy: string,
    readonly saved: Part[],
  ) {
    super(copy);
  }
}

export type MentorProfileSave = {
  before: MentorProfileValues;
  after: MentorProfileValues;
  /** The prompt version of the AI draft in the About, when it's still one. */
  promptVersion: string | null;
};

const sameLanguages = (a: MentorProfileValues['languages'], b: MentorProfileValues['languages']) =>
  a.length === b.length && a.every((l, i) => l.id === b[i]!.id);

/** Only what changed, split by where it's stored. Empty bodies are left out. */
export function mentorProfileBodies({ before, after, promptVersion }: MentorProfileSave) {
  const details: Record<string, unknown> = {};
  if (after.name !== before.name) details.full_name = tidyName(after.name);
  if (after.about !== before.about || after.aboutDrafted !== before.aboutDrafted)
    Object.assign(details, aboutBody(after.about, { drafted: after.aboutDrafted, promptVersion }));
  if (after.gender !== before.gender) details.gender = after.gender || null;
  if (after.originId !== before.originId) details.origin_country_id = after.originId || null;
  const listing: Record<string, unknown> = {};
  if (after.headline !== before.headline) listing.headline = after.headline.trim();
  if (after.studyId !== before.studyId) listing.primary_study_country_id = after.studyId || null;
  return {
    details: Object.keys(details).length ? details : null,
    listing: Object.keys(listing).length ? listing : null,
    languages: sameLanguages(after.languages, before.languages)
      ? null
      : { languages: after.languages.map((l) => ({ language_id: l.id })) },
  };
}

/** Which values each write carries, so a partial save can count what landed. */
const PART_FIELDS: Record<Part, (keyof MentorProfileValues)[]> = {
  details: ['name', 'about', 'aboutDrafted', 'gender', 'originId'],
  listing: ['headline', 'studyId'],
  languages: ['languages'],
};

/** What's saved after a partial failure: the landed parts from `after`, the rest as before. */
export function withSaved(
  before: MentorProfileValues,
  after: MentorProfileValues,
  saved: readonly Part[],
): MentorProfileValues {
  const next = { ...before };
  for (const part of saved)
    for (const k of PART_FIELDS[part]) Object.assign(next, { [k]: after[k] });
  return next;
}

function saveCopy(e: unknown, saved: Part[], failed: Part): string {
  if (saved.length) return MENTOR_PROFILE_COPY.partlySaved(MENTOR_PROFILE_COPY.parts[failed]);
  return normaliseError(e).kind === 'offline' ? SAVE_COPY.profileOffline : SAVE_COPY.profileFailed;
}

/**
 * Save on Settings › Profile: the profile (name, About, gender, origin), the
 * mentor profile (headline, study country), then the languages, each only
 * when something in it changed. A failure says which part didn't land.
 */
export function useSaveMentorProfile(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, MentorProfileSaveError, MentorProfileSave>({
    networkMode: 'always',
    mutationFn: async (save) => {
      if (!userId) throw new MentorProfileSaveError(SAVE_COPY.profileFailed, []);
      const bodies = mentorProfileBodies(save);
      const path = { params: { path: { user_id: userId } } };
      const steps: [Part, () => Promise<{ error?: unknown; response: Response }>][] = [];
      if (bodies.details)
        steps.push([
          'details',
          // Only the fields that changed (the generated type lists every field).
          () => api.PATCH('/api/v1/users/{user_id}/profile', { ...path, body: bodies.details! }),
        ]);
      if (bodies.listing)
        steps.push([
          'listing',
          () =>
            api.PATCH('/api/v1/users/{user_id}/mentor-profile', {
              ...path,
              body: bodies.listing as never,
            }),
        ]);
      if (bodies.languages)
        steps.push([
          'languages',
          () => api.PUT('/api/v1/users/{user_id}/languages', { ...path, body: bodies.languages! }),
        ]);
      const saved: Part[] = [];
      for (const [part, run] of steps) {
        try {
          const { error, response } = await run();
          if (!response.ok) throw apiError(response.status, error);
        } catch (e) {
          throw new MentorProfileSaveError(saveCopy(e, saved, part), saved);
        }
        saved.push(part);
      }
    },
    // Whatever landed shows everywhere: the profile page, Explore, the shell's name.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
    },
  });
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// ---- Settings › Expertise: "Where can you guide mentees to?" (backend #506) ----

export type GuideCountry = { id: string; label: string };

/** The most countries a mentor can name (backend: a 422 above it). */
export const GUIDE_MAX = 8;

/** GET /users/{id}/mentor-profile: the mentor's guide-to countries, in their order. */
export function useGuideCountries(userId: string | null) {
  const query = useQuery({
    queryKey: keys.viewer.guideCountries(userId ?? 'none'),
    enabled: userId !== null,
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<GuideCountry[]> => {
      const { data, error, response } = await api.GET('/api/v1/users/{user_id}/mentor-profile', {
        params: { path: { user_id: userId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return (data.guide_countries ?? []).map((c) => ({ id: c.id, label: c.display_name }));
    },
  });
  // Error before content: a failed refetch of a loaded list keeps it.
  const status: 'loading' | 'error' | 'ready' = query.data
    ? 'ready'
    : query.error
      ? 'error'
      : 'loading';
  return {
    countries: query.data ?? null,
    status,
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}

/** PATCH guide_country_ids: the whole list, in the mentor's order (it replaces the saved one). */
export function useSaveGuideCountries(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<GuideCountry[], { copy: string }, GuideCountry[]>({
    networkMode: 'always',
    mutationFn: async (next) => {
      try {
        if (!userId) throw new Error('no user');
        const { error, response } = await api.PATCH('/api/v1/users/{user_id}/mentor-profile', {
          params: { path: { user_id: userId } },
          // A partial update: only the countries (the generated type lists every field).
          body: { guide_country_ids: next.map((c) => c.id) } as never,
        });
        if (!response.ok) throw apiError(response.status, error);
      } catch (e) {
        throw {
          copy:
            normaliseError(e).kind === 'offline'
              ? SAVE_COPY.profileOffline
              : MENTOR_EXPERTISE_COPY.guideSaveFailed,
        };
      }
      return next;
    },
    onSuccess: (saved) => {
      // What saved shows straight away; a failed refetch can't put the old list back.
      if (userId) qc.setQueryData(keys.viewer.guideCountries(userId), saved);
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
    },
  });
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
