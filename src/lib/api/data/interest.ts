'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AppError, Remote } from '@/types/mentor';
import { normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/**
 * "Tell me when this ships", for any coming-soon thing in the product.
 *
 * **PENDING BACKEND (#365).** The endpoint is written but not merged, so it is
 * absent from the published spec and the generated client cannot name its path.
 * Nothing is stored anywhere until it does: in production the probe below finds
 * no endpoint and the button is never offered.
 *
 * Deliberately feature-agnostic — it takes a slug, not an integrations concept,
 * so Explore's cut "Notify me" (divergence row 19) reuses it unchanged.
 */

/** The one cast, in one place. Delete it when the path reaches the spec. */
const untyped = api as unknown as {
  GET: (path: string, init?: unknown) => Promise<{ data?: unknown; response: Response }>;
  POST: (path: string, init?: unknown) => Promise<{ data?: unknown; response: Response }>;
};

const PATH = '/api/v1/me/interest';

export type Interest = {
  /**
   * Whether the endpoint exists at all. **Keyed off `200` specifically, never
   * off "not 404"**: a probe that runs before the bearer token is attached sees
   * `401` both before and after the endpoint merges, so "not 404" would offer a
   * button that cannot work (backend, 2026-10-06).
   */
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
export function useInterest(enabled: boolean): Remote<Interest> {
  const query = useQuery({
    queryKey: keys.interest.all,
    enabled,
    // The answer changes only when this account presses the button.
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<Interest> => {
      const { data, response } = await untyped.GET(PATH, { signal });
      if (response.status !== 200) return { available: false, features: [] };
      const rows = (data as { data?: { feature?: string }[] } | undefined)?.data ?? [];
      return {
        available: true,
        features: rows.map((r) => r.feature).filter((f): f is string => typeof f === 'string'),
      };
    },
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && enabled,
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
export function useRegisterInterest() {
  const qc = useQueryClient();
  const mutation = useMutation<void, AppError, string>({
    mutationFn: async (feature) => {
      let r;
      try {
        r = await untyped.POST(PATH, { body: { feature } });
      } catch (e) {
        throw interestError(e);
      }
      if (!r.response.ok) throw interestError({ status: r.response.status });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.interest.all });
    },
  });
  return {
    register: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
