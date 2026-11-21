'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { menteeByChoice } from './roles';
import { deviceTimeZone } from '@/lib/utils/format';
import { NAME_PROBLEM_COPY, splitFullName, tidyName } from '@/lib/utils/name';
import { sessionUserId } from '@/lib/vendor/supabase/browser';
import { api } from './http';
import { keys } from './keys';
import { isMeRead, meQuery } from './me';

/** The account behind a fresh sign-in, as far as where to send them goes. */
export type SignInAccount =
  | {
      kind: 'member';
      id: string;
      /** null: never named. The finish step, or the name typed at sign-up, fills it. */
      firstName: string | null;
      /** Any mentor profile, approved or not. */
      isMentor: boolean;
      /** The mentor profile's approval_status is `approved` (pending and declined are not). */
      mentorApproved: boolean;
      /**
       * The approved screen was shown (`approved_seen_at`, PRD B2; always sent,
       * null until seen). Absent (a backend without B2): treated as seen.
       */
      mentorApprovedSeen?: boolean;
      /** `/me` `onboarding.complete`; null when /me doesn't say (treated as done). */
      onboardingComplete: boolean | null;
      /** Signed up as a mentor with no mentor profile or goal yet (`primary_role` mentor). */
      signedUpAsMentor: boolean;
      /** Any mentor profile row (a declined one a mentee-by-choice keeps, too). */
      hasMentorProfile: boolean;
      /** `/me` `timezone`; null when /me doesn't say. `UTC` is the backend's default. */
      timezone: string | null;
    }
  /** No account for this sign-in (404) or one that isn't linked to it (409). */
  | { kind: 'noAccount' }
  | { kind: 'error' };

/**
 * The one /me (me.ts), read for this session as it is now: the SDK's user id
 * keys it, since the session store may not have caught up a moment after
 * sign-in. Asked afresh, never from the cache; what it reads is cached where
 * the page they land on looks, so that page doesn't ask again. No retry here:
 * the caller decides (loadAccount).
 */
async function readMeNow(qc: QueryClient) {
  const authId = await sessionUserId();
  if (!authId) throw new Error('no session');
  return qc.fetchQuery({ ...meQuery(authId), staleTime: 0, retry: false });
}

/** GET /me right after the code or Google: where to send them. */
export async function fetchSignInAccount(qc: QueryClient): Promise<SignInAccount> {
  try {
    const entry = await readMeNow(qc);
    if (!isMeRead(entry)) return { kind: 'noAccount' };
    const data = entry.me;
    return {
      kind: 'member',
      id: data.id,
      firstName: data.first_name ?? null,
      // A declined applicant who chose mentee signs in to the mentee side.
      isMentor: !!data.mentor_profile && !menteeByChoice(data),
      mentorApproved: data.mentor_profile?.approval_status === 'approved',
      mentorApprovedSeen: data.mentor_profile?.approved_seen_at !== null,
      onboardingComplete: data.onboarding?.complete ?? null,
      signedUpAsMentor: !data.mentor_profile && data.goal == null && data.primary_role === 'mentor',
      hasMentorProfile: !!data.mentor_profile,
      timezone: data.timezone || null,
    };
  } catch {
    return { kind: 'error' };
  }
}

export type NameToSave = { fullName: string } | { firstName: string; lastName: string };

/** Thrown with the words to show under the name field. */
export class NameSaveError extends Error {}

const NAME_POINTERS = new Set(['/full_name', '/first_name', '/last_name']);
const SAVE_FAILED = 'We couldn’t save your name. Try again.';

/** The backend's 422 message for a one-word (or blank) full name (#476). */
const ONE_WORD = /first and a last name/i;

/**
 * A proxy in front of the API (the Vercel rewrite, Railway's edge) can answer
 * 502–504, or drop the line, after the save committed; the API itself never
 * sends these here.
 */
const PROXY_ERRORS = new Set([502, 503, 504]);

/** A blip at the edge (a redeploy, a cold start) usually clears within a second. */
export const NAME_RETRY_MS = 800;

type NameBody = ({ full_name: string } | { first_name: string; last_name: string }) & {
  timezone?: string;
};

/** The zone a new account is made with until someone picks one. */
const BACKEND_DEFAULT_ZONE = 'UTC';

/**
 * The zone to save with a name: this device's, but only when the account has
 * none of its own yet (empty, or still the backend's UTC default), so a zone
 * someone chose is never overwritten. Undefined when the device's isn't a
 * valid IANA zone either.
 */
export function zoneToSave(accountZone: string | null | undefined): string | undefined {
  if (accountZone && accountZone !== BACKEND_DEFAULT_ZONE) return undefined;
  const zone = deviceTimeZone();
  if (!zone) return undefined;
  try {
    // Throws a RangeError on anything that isn't a zone.
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

/** The PATCH, or null when a proxy failed it: the backend sets the name, so sending it twice is safe. */
async function patchName(userId: string, body: NameBody) {
  try {
    const res = await api.PATCH('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: userId } },
      body,
    });
    return PROXY_ERRORS.has(res.response.status) ? null : res;
  } catch {
    return null;
  }
}

/** Whether /me, read afresh, now has the first name we sent: a save a proxy failed may have landed. */
async function nameLanded(qc: QueryClient, body: NameBody) {
  const first = 'first_name' in body ? body.first_name : splitFullName(body.full_name).firstName;
  try {
    const entry = await readMeNow(qc);
    return !!first && isMeRead(entry) && entry.me.first_name === first;
  } catch {
    return false;
  }
}

type ProfileError = { errors?: { pointer?: string; message?: string }[] } | undefined;

/** A 422's error on a name field, if it has one. */
function nameRefusal(res: NonNullable<Awaited<ReturnType<typeof patchName>>>) {
  if (res.response.status !== 422) return undefined;
  return ((res.error as ProfileError)?.errors ?? []).find((e) =>
    NAME_POINTERS.has(e.pointer ?? ''),
  );
}

/**
 * The PATCH with its proxy retry. `saved` when it went through, or when a
 * proxy failed the first try and /me shows the name landed anyway.
 */
async function sendName(qc: QueryClient, userId: string, body: NameBody) {
  const first = await patchName(userId, body);
  let res = first;
  if (!res) {
    await new Promise((r) => setTimeout(r, NAME_RETRY_MS));
    res = await patchName(userId, body);
  }
  if (res?.response.ok) return { saved: true as const };
  // The first try may have landed behind the proxy error, whatever the retry says.
  if (!first && (await nameLanded(qc, body))) return { saved: true as const };
  return { saved: false as const, res };
}

export type SaveNameInput = {
  userId: string;
  name: NameToSave;
  /** An IANA zone to save with the name (zoneToSave decides); left out, the account's stays. */
  timezone?: string;
};

/**
 * Save a name from either shape of input. A full name goes out as `full_name`
 * and the backend splits it (first word / the rest); two fields go out as
 * `first_name` + `last_name`. A 422 on a name field reads as the rule's own
 * words, told apart by its message; anything else is a plain "try again"
 * (Problem Details `detail` is never shown). A proxy error is tried once
 * more, then GET /me says whether the name landed anyway.
 *
 * A `timezone` the caller passes goes with it. A refused zone never stops
 * the name: any other 422 sends the name once more without it.
 */
export function useSaveName() {
  const qc = useQueryClient();
  return useMutation<void, NameSaveError, SaveNameInput>({
    networkMode: 'always',
    mutationFn: async ({ userId, name, timezone }) => {
      const named: NameBody =
        'fullName' in name
          ? { full_name: tidyName(name.fullName) }
          : { first_name: tidyName(name.firstName), last_name: tidyName(name.lastName) };
      let sent = await sendName(qc, userId, timezone ? { ...named, timezone } : named);
      if (timezone && !sent.saved && sent.res?.response.status === 422 && !nameRefusal(sent.res)) {
        sent = await sendName(qc, userId, named);
      }
      if (sent.saved) return;
      const { res } = sent;
      if (!res) throw new NameSaveError(SAVE_FAILED);
      const onName = nameRefusal(res);
      if (!onName) throw new NameSaveError(SAVE_FAILED);
      throw new NameSaveError(
        ONE_WORD.test(onName.message ?? '')
          ? NAME_PROBLEM_COPY.oneWord
          : NAME_PROBLEM_COPY.characters,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.viewer.all }),
  });
}
