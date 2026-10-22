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

/** Reviews per page while scanning for the newest showable one. */
const PAGE_SIZE = 20;
/** Cap on pages walked, so a misbehaving cursor can never loop forever. */
const MAX_PAGES = 25;

/**
 * The attribution line: first name + initial exactly as the public page shows
 * it (the surname is never exposed), "Deleted user" when the author is gone, and
 * the session type appended when the review records one. Mirrors `toReview`'s author naming.
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
 * see those), so we take the newest `withdrawn: false` one. Pages are walked via
 * `next_cursor` until a showable review is found or the list is exhausted, so
 * `null` data means no showable review **all-time** — not merely none on the
 * newest page — a real, non-error state the card renders as "no reviews yet".
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
      let cursor: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error, response } = await api.GET('/api/v1/me/reviews', {
          params: { query: { cursor, limit: PAGE_SIZE } },
          signal,
        });
        if (!data) throw apiError(response.status, error);
        const showable = data.data.find((r) => !r.withdrawn);
        if (showable) return { quote: showable.public_review, by: quoteBy(showable) };
        if (!data.next_cursor) return null;
        cursor = data.next_cursor;
      }
      return null;
    },
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
