'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { MenteeProfileValues } from '@/types/settings';
import { SAVE_COPY } from '@/lib/copy/settings';
import { personInitials } from '@/lib/utils/person';
import { countriesQuery, type CatalogOption } from './catalog';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { patchProfile, useMeSlice, type MeRead, type ProfilePatch } from './me';
import { aboutBody } from './profileEdit';

/** What Settings opens with (GET /me): Profile's values, and Login and security's account facts. */
export type MenteeProfile = MenteeProfileValues & {
  /** Where they're from as saved; '' while `originId` is only the prefill. */
  savedOriginId: string;
  photoUrl: string | null;
  /** Two letters, first and last name; the email's first letter with neither. */
  initials: string;
  email: string;
  emailVerified: boolean;
  /** Confirmed sessions not yet started, on either side: what deleting the account cancels. */
  upcomingCount: number;
  /** Requests still awaiting an answer, sent or received: deleting withdraws or declines them. */
  requestCount: number;
};

type Me = components['schemas']['UserRead'];

/**
 * GET /me as Settings reads it. The country comes as a code (a CountryRef);
 * `countries` maps it to the catalog id the picker holds.
 */
export function toMenteeProfile(
  me: Pick<
    Me,
    | 'first_name'
    | 'last_name'
    | 'email'
    | 'profile'
    | 'languages'
    | 'email_verified_at'
    | 'booking_counts'
  >,
  countries: CatalogOption[] = [],
): MenteeProfile {
  const name = [me.first_name, me.last_name].filter(Boolean).join(' ').trim();
  const idOf = (code: string | undefined) =>
    (code && countries.find((c) => c.code === code)?.id) || '';
  const savedOriginId = idOf(me.profile?.origin_country?.code);
  return {
    name,
    // Unset: where they live fills it in (PRD S7, many migrated accounts
    // have only that), saved with the next Save.
    originId: savedOriginId || idOf(me.profile?.current_country?.code),
    savedOriginId,
    languages: (me.languages ?? []).map((l) => ({ id: l.id, label: l.display_name })),
    bio: me.profile?.about_me ?? '',
    bioDrafted: !!me.profile?.about_me_drafted_at && !!me.profile?.about_me,
    photoUrl: me.profile?.avatar_url ?? null,
    initials: personInitials(me.first_name, me.last_name, me.email),
    email: me.email,
    emailVerified: !!me.email_verified_at,
    upcomingCount:
      (me.booking_counts?.as_mentee?.upcoming ?? 0) + (me.booking_counts?.as_mentor?.upcoming ?? 0),
    requestCount:
      (me.booking_counts?.as_mentee?.awaiting_mentor ?? 0) +
      (me.booking_counts?.as_mentor?.awaiting_your_response ?? 0),
  };
}

const readOf = (r: MeRead) => r;

/**
 * The signed-in mentee's own details, for Settings › Profile and Login and
 * security: a slice of the one /me (me.ts), with the latest save over it
 * until /me is read again.
 */
export function useMenteeProfile(userId: string | null) {
  const me = useMeSlice(userId !== null, readOf);
  // Only a saved country needs the catalog (cached for an hour, shared with
  // the picker). A catalog failure mustn't hide a profile that loaded: the
  // country shows empty instead (no retry, as before: it fills in if the
  // catalog answers later).
  const needsCountries =
    !!me.data?.me.profile?.origin_country || !!me.data?.me.profile?.current_country;
  const countries = useQuery({ ...countriesQuery, enabled: needsCountries, retry: false });
  const countriesSettled = !needsCountries || countries.isSuccess || countries.isError;
  const profile = useMemo(
    () =>
      me.data && countriesSettled
        ? { ...toMenteeProfile(me.data.me, countries.data ?? []), ...me.data.profile }
        : null,
    [me.data, countriesSettled, countries.data],
  );
  // Error before content: a failed refetch of a loaded profile keeps it.
  const status: 'loading' | 'error' | 'ready' = profile
    ? 'ready'
    : me.status === 'error'
      ? 'error'
      : 'loading';
  return { profile, status, retry: me.retry, retrying: me.retrying };
}

/** A failed save, in our words. `profileSaved`: the name, origin and bio landed; the languages didn't. */
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
  /**
   * Where they're from as saved, when `before` holds the prefill: the origin
   * is written whenever the form's differs from it. Unset: from `before`.
   */
  savedOriginId?: string;
};

const originChanged = ({ before, after, savedOriginId }: ProfileSave) =>
  after.originId !== (savedOriginId ?? before.originId);

/** The body for PATCH /users/{id}/profile: only what changed. */
export function profileBody(save: ProfileSave) {
  const { before, after, promptVersion } = save;
  const name = after.name.trim();
  const body: components['schemas']['UserProfileWrite'] = {};
  if (name !== before.name.trim()) body.full_name = name;
  if (originChanged(save)) body.origin_country_id = after.originId || null;
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
  const remember = (v: ProfilePatch) => patchProfile(qc, v);
  return useMutation<void, ProfileSaveError, ProfileSave>({
    networkMode: 'always',
    mutationFn: async (save) => {
      if (!userId) throw new ProfileSaveError(SAVE_COPY.profileFailed);
      const path = { params: { path: { user_id: userId } } };
      const body = profileBody(save);
      // Only an origin that was written becomes the saved one (Home's bio
      // save carries the prefill without writing it).
      const origin = 'origin_country_id' in body ? { savedOriginId: save.after.originId } : {};
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
        if (profileSaved)
          remember({
            ...save.after,
            languages: save.before.languages,
            ...origin,
          });
        throw new ProfileSaveError(
          offline(e)
            ? SAVE_COPY.profileOffline
            : profileSaved
              ? SAVE_COPY.languagesFailed
              : SAVE_COPY.profileFailed,
          profileSaved,
        );
      }
      remember({ ...save.after, ...origin });
    },
    // The shell's name and photo and Settings' own read; a new origin is a
    // new ranking, so the matches, Explore's lists and Home's suggestions
    // refresh too, as after a Goals save.
    onSettled: (_d, _e, save) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.viewer.all }),
        qc.invalidateQueries({ queryKey: keys.onboarding.matchesAll }),
        ...(save && originChanged(save)
          ? [
              qc.invalidateQueries({ queryKey: keys.onboarding.all }),
              qc.invalidateQueries({ queryKey: keys.mentors.listAll }),
              qc.invalidateQueries({ queryKey: keys.menteeHome.all }),
            ]
          : []),
      ]),
  });
}
