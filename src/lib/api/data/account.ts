'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { SECURITY_COPY } from '@/lib/copy/settings';
import type { LoginProvider } from '@/types/settings';
import { signedInUser } from './auth';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/**
 * How this session's account logs in (Supabase's identities, through the
 * vendor seam). Unreadable (signed out, Supabase unreachable) reads as the
 * email code, the way in every passwordless account has, but only for now:
 * the failure isn't cached, so the next visit asks again.
 */
export function useLoginProvider(userId: string | null) {
  const query = useQuery({
    queryKey: keys.viewer.loginProvider(userId ?? 'none'),
    enabled: userId !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<LoginProvider> => {
      const user = await signedInUser();
      if (!user) throw new Error('no signed-in user to read');
      return user.loginProvider;
    },
  });
  const provider: LoginProvider | null = query.data ?? (query.isError ? 'email' : null);
  return { provider };
}

/** A failed delete, in our words. */
export class DeleteAccountError extends Error {
  constructor(readonly copy: string) {
    super('account delete failed');
  }
}

/**
 * Deletes the signed-in account (DELETE /me, edufurtherbe #501). The backend
 * ends every open session and request and signs the user out everywhere; the
 * caller then signs out here (useSignOut). Nothing is invalidated or refetched:
 * /me 404s from now on, and the page leaves.
 *
 * The body is always the constant "DELETE", never the typed text: the modal
 * checks the word, this sends what it means. A 404 is the account already
 * gone (a second request racing our own 204), so it counts as done.
 */
export function useDeleteAccount() {
  return useMutation<void, DeleteAccountError, void>({
    networkMode: 'always',
    mutationFn: async () => {
      try {
        const { error, response } = await api.DELETE('/api/v1/me', {
          body: { confirm: 'DELETE' },
        });
        if (!response.ok && response.status !== 404) throw apiError(response.status, error);
      } catch (e) {
        const err = normaliseError(e);
        throw new DeleteAccountError(
          err.kind === 'offline'
            ? SECURITY_COPY.offline
            : err.kind === 'validation'
              ? SECURITY_COPY.wrongWord
              : SECURITY_COPY.failed,
        );
      }
    },
  });
}
