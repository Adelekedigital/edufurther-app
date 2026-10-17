'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NAME_PROBLEM_COPY, tidyName } from '@/lib/utils/name';
import { api } from './http';
import { keys } from './keys';

/** The account behind a fresh sign-in, as far as where to send them goes. */
export type SignInAccount =
  | {
      kind: 'member';
      id: string;
      /** null: never named. The finish step, or the name typed at sign-up, fills it. */
      firstName: string | null;
      isAdmin: boolean;
      /** Any mentor profile, approved or not. */
      isMentor: boolean;
      /** The mentor profile's approval_status is `approved` (pending and declined are not). */
      mentorApproved: boolean;
    }
  /** No account for this sign-in (404) or one that isn't linked to it (409). */
  | { kind: 'noAccount' }
  | { kind: 'error' };

/**
 * GET /me right after the code or Google, outside the query cache: the cache
 * is keyed by a session that didn't exist a moment ago. The viewer query then
 * fetches as usual for the page they land on.
 */
export async function fetchSignInAccount(): Promise<SignInAccount> {
  try {
    const { data, response } = await api.GET('/api/v1/me');
    if (response.status === 404 || response.status === 409) return { kind: 'noAccount' };
    if (!data) return { kind: 'error' };
    return {
      kind: 'member',
      id: data.id,
      firstName: data.first_name ?? null,
      isAdmin: !!data.is_admin,
      isMentor: !!data.mentor_profile,
      mentorApproved: data.mentor_profile?.approval_status === 'approved',
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
 * Save a name from either shape of input. A full name goes out as `full_name`
 * and the backend splits it (first word / the rest); two fields go out as
 * `first_name` + `last_name`. A 422 on a name field reads as the rule's own
 * words, told apart by its message; anything else is a plain "try again"
 * (Problem Details `detail` is never shown).
 */
export function useSaveName() {
  const qc = useQueryClient();
  return useMutation<void, NameSaveError, { userId: string; name: NameToSave }>({
    networkMode: 'always',
    mutationFn: async ({ userId, name }) => {
      const body =
        'fullName' in name
          ? { full_name: tidyName(name.fullName) }
          : { first_name: tidyName(name.firstName), last_name: tidyName(name.lastName) };
      let res;
      try {
        res = await api.PATCH('/api/v1/users/{user_id}/profile', {
          params: { path: { user_id: userId } },
          body,
        });
      } catch {
        throw new NameSaveError(SAVE_FAILED);
      }
      if (res.response.ok) return;
      const errors =
        (res.error as { errors?: { pointer?: string; message?: string }[] } | undefined)?.errors ??
        [];
      const onName =
        res.response.status === 422
          ? errors.find((e) => NAME_POINTERS.has(e.pointer ?? ''))
          : undefined;
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
