'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { MenteeProfileValues } from '@/types/settings';
import { SAVE_COPY } from '@/lib/copy/settings';
import { countriesQuery, type CatalogOption } from './catalog';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { aboutBody } from './profileEdit';

/** What Settings › Profile opens with (GET /me). */
export type MenteeProfile = MenteeProfileValues & {
  photoUrl: string | null;
  initial: string;
};

type Me = components['schemas']['UserRead'];

/**
 * GET /me as Settings reads it. The country comes as a code (a CountryRef);
 * `countries` maps it to the catalog id the picker holds.
 */
export function toMenteeProfile(
  me: Pick<Me, 'first_name' | 'last_name' | 'email' | 'profile' | 'languages'>,
  countries: CatalogOption[] = [],
): MenteeProfile {
  const name = [me.first_name, me.last_name].filter(Boolean).join(' ').trim();
  const code = me.profile?.current_country?.code;
  return {
    name,
    countryId: (code && countries.find((c) => c.code === code)?.id) || '',
    languages: (me.languages ?? []).map((l) => ({ id: l.id, label: l.display_name })),
    bio: me.profile?.about_me ?? '',
    bioDrafted: !!me.profile?.about_me_drafted_at && !!me.profile?.about_me,
    photoUrl: me.profile?.avatar_url ?? null,
    initial: (name || me.email)[0]?.toUpperCase() ?? '?',
  };
}

/** The signed-in mentee's own details, for Settings › Profile. */
export function useMenteeProfile(userId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.viewer.settings(userId ?? 'none'),
    enabled: userId !== null,
    retry: retryOnce,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/me', { signal });
      if (!data) throw apiError(response.status, error);
      const me = data;
      // Only a saved country needs the catalog (cached for an hour, shared with
      // the picker). A catalog failure mustn't hide a profile that loaded: the
      // country shows empty until the catalog answers and /me is read again.
      const countries = me.profile?.current_country
        ? await qc.fetchQuery(countriesQuery).catch(() => [])
        : [];
      return toMenteeProfile(me, countries);
    },
  });
  // Error before content: a failed refetch of a loaded profile keeps it.
  const status: 'loading' | 'error' | 'ready' = query.data
    ? 'ready'
    : query.error
      ? 'error'
      : 'loading';
  return {
    profile: query.data ?? null,
    status,
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}

/** A failed save, in our words. `profileSaved`: the name, country and bio landed; the languages didn't. */
export class ProfileSaveError extends Error {
  constructor(
    readonly copy: string,
    readonly profileSaved = false,
  ) {
    super('profile save failed');
  }
}

const offline = (e: unknown) => normaliseError(e).kind === 'offline';
// Languages are a set: the API keeps no order, so a reorder is no change.
const idSet = (l: { id: string }[]) =>
  l
    .map((x) => x.id)
    .sort()
    .join(',');
const sameIds = (a: { id: string }[], b: { id: string }[]) => idSet(a) === idSet(b);

export type ProfileSave = {
  before: MenteeProfileValues;
  after: MenteeProfileValues;
  /** The AI draft's prompt version, while the bio is still that draft. */
  promptVersion: string | null;
};

/** The body for PATCH /users/{id}/profile: only what changed. */
export function profileBody({ before, after, promptVersion }: ProfileSave) {
  const name = after.name.trim();
  const body: components['schemas']['UserProfileWrite'] = {};
  if (name !== before.name.trim()) body.full_name = name;
  if (after.countryId !== before.countryId) body.current_country_id = after.countryId || null;
  if (after.bio !== before.bio || after.bioDrafted !== before.bioDrafted)
    Object.assign(body, aboutBody(after.bio, { drafted: after.bioDrafted, promptVersion }));
  return body;
}

/**
 * Settings › Profile's Save: the profile (name, country, bio), then the
 * languages (PUT, the whole list), each only when it changed. What landed is
 * written into Settings' cached /me at once, so a failed refetch can't put
 * the old values back under "Profile saved"; then /me refetches. A save that
 * lands partly says so, and says which part landed.
 */
export function useSaveMenteeProfile(userId: string | null) {
  const qc = useQueryClient();
  const remember = (v: MenteeProfileValues) =>
    qc.setQueryData<MenteeProfile>(keys.viewer.settings(userId ?? 'none'), (p) =>
      p ? { ...p, ...v } : p,
    );
  return useMutation<void, ProfileSaveError, ProfileSave>({
    networkMode: 'always',
    mutationFn: async (save) => {
      if (!userId) throw new ProfileSaveError(SAVE_COPY.profileFailed);
      const path = { params: { path: { user_id: userId } } };
      const body = profileBody(save);
      let profileSaved = false;
      try {
        if (Object.keys(body).length) {
          const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
            ...path,
            body,
          });
          if (!response.ok) throw apiError(response.status, error);
          profileSaved = true;
        }
        if (!sameIds(save.after.languages, save.before.languages)) {
          const { error, response } = await api.PUT('/api/v1/users/{user_id}/languages', {
            ...path,
            body: { languages: save.after.languages.map((l) => ({ language_id: l.id })) },
          });
          if (!response.ok) throw apiError(response.status, error);
        }
      } catch (e) {
        if (profileSaved) remember({ ...save.after, languages: save.before.languages });
        throw new ProfileSaveError(
          offline(e)
            ? SAVE_COPY.profileOffline
            : profileSaved
              ? SAVE_COPY.languagesFailed
              : SAVE_COPY.profileFailed,
          profileSaved,
        );
      }
      remember(save.after);
    },
    // The shell's name and photo, Settings' own read, and the mentors
    // suggested by where they live.
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.viewer.all }),
        qc.invalidateQueries({ queryKey: keys.onboarding.matchesAll }),
      ]),
  });
}
