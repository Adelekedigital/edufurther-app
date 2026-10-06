'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppError, Remote } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';

/**
 * "Tell me when this ships", for any coming-soon thing in the product.
 *
 * Deliberately feature-agnostic — it takes a slug, not an integrations concept,
 * so Explore's cut "Notify me" (divergence row 19) reuses it unchanged.
 *
 * `registered_at` is when they **first** asked; a repeat press is a no-op and
 * does not move it. Case is folded server-side, whitespace is not — so send the
 * exact slug rather than trimming and hoping.
 */

export type Interest = {
  /** Whether asking is possible. False only if the endpoint goes away. */
  available: boolean;
  /** Slugs this account has already asked about. */
  features: string[];
};

/**
 * GET the account's registered interests, and whether asking is possible yet.
 *
 * Once the endpoint exists it answers `200` with an empty list rather than
 * `404` for an account that has asked for nothing — so this flips from absent
 * to present exactly once, and never flickers afterwards.
 */
export function useInterest(userId: string | null): Remote<Interest> {
  const query = useQuery({
    queryKey: keys.interest.forUser(userId ?? 'none'),
    enabled: userId !== null,
    // The answer changes only when this account presses the button.
    staleTime: 5 * 60_000,
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<Interest> => {
      const { data, error, response } = await api.GET('/api/v1/me/interest', { signal });
      // A 404 would mean the endpoint is gone, not that nothing is registered —
      // an account that has asked for nothing gets 200 and an empty list. Any
      // other non-200 is a failure: resolving it as an absence would hide the
      // control for the whole staleTime with no error and no retry.
      if (response.status === 404) return { available: false, features: [] };
      if (!data) throw apiError(response.status, error, response);
      return { available: true, features: data.data.map((r) => r.feature) };
    },
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** Our copy for a failed request. */
function interestError(error: unknown): AppError {
  const e = normaliseError(error);
  return {
    ...e,
    message:
      e.kind === 'offline'
        ? 'You’re offline, so we couldn’t sign you up. Try again when you reconnect.'
        : 'We couldn’t sign you up just now. Try again.',
  };
}

/**
 * Register interest in one feature. Pressing twice is the same as once — the
 * backend is unique on (account, feature) and keeps the *first* time asked.
 */
export function useRegisterInterest(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, string>({
    mutationFn: async (feature) => {
      let r;
      try {
        r = await api.POST('/api/v1/me/interest', { body: { feature } });
      } catch (e) {
        throw interestError(e);
      }
      // `normaliseError` classifies an ApiError; a bare object falls through to
      // `unknown`, losing the status and any Retry-After (conferencing.ts:76).
      if (!r.response.ok) throw interestError(apiError(r.response.status, r.error, r.response));
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.interest.forUser(userId ?? 'none') });
    },
  });
  return {
    register: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
