'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';

type OwnReviewRead = components['schemas']['OwnReviewRead'];

/** One mentee review, reduced to what the dashboard quote shows. */
export type ReviewQuote = {
  /** The public review text. */
  quote: string;
  /** "Ada L." (or "Deleted user"), plus " · {offering}" when the review names one. */
  by: string;
};

/** How many recent reviews to scan for the newest showable one (withdrawn ones are skipped). */
const SCAN = 10;

/**
 * The attribution line: first name + initial exactly as the public page shows
 * it (the surname is never exposed), "Deleted user" when the author is gone, and
 * the offering appended when the review records one. Mirrors `toReview`'s naming.
 */
function quoteBy(r: OwnReviewRead): string {
  const first = r.author_first_name?.trim() || '';
  const last = r.author_last_initial?.trim().slice(0, 1).toUpperCase() || '';
  const deleted = r.author_deleted || !first;
  const name = deleted ? 'Deleted user' : last ? `${first} ${last}.` : first;
  const topic = r.session_type?.name ? ` · ${r.session_type.name}` : '';
  return `${name}${topic}`;
}

/**
 * GET /api/v1/me/reviews → the newest review worth quoting on the dashboard.
 * The list is newest first and includes withdrawn reviews (only the subject may
 * see those), so we take the newest `withdrawn: false` one. `null` data means no
 * showable review — a real, non-error state the card renders as "no reviews yet".
 *
 * Supplementary to the session-quality card: the caller treats a failure or an
 * empty result as "no quote", never as a reason to fail the whole panel.
 */
export function useMyReviewQuote(userId: string | null): Remote<ReviewQuote> {
  const query = useQuery({
    queryKey: keys.myReviews.quote(userId ?? 'none'),
    enabled: userId !== null,
    staleTime: 60_000,
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<ReviewQuote | null> => {
      const { data, error, response } = await api.GET('/api/v1/me/reviews', {
        params: { query: { limit: SCAN } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      const showable = data.data.find((r) => !r.withdrawn);
      if (!showable) return null;
      return { quote: showable.public_review, by: quoteBy(showable) };
    },
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
