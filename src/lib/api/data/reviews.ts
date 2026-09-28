'use client';

import { useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, Review, ReviewPrompt } from '@/types/mentor';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type MentorReviewRead = components['schemas']['MentorReviewRead'];
type MentorRelationshipRead = components['schemas']['MentorRelationshipRead'];

/** Mentor Profile.dc.html: five reviews, then "Show N more reviews". */
export const REVIEW_PAGE_SIZE = 5;

// ---- mapping ----------------------------------------------------------------

/**
 * `guest`: the text is dropped here, so a guest's page never holds it (the
 * design redacts it behind a sign-up card; the API doesn't).
 */
export function toReview(r: MentorReviewRead, guest = false): Review {
  const first = r.author_first_name?.trim() || '';
  const last = r.author_last_initial?.trim().slice(0, 1).toUpperCase() || '';
  const deleted = r.author_deleted || !first;
  return {
    id: r.id,
    author: deleted ? 'Deleted user' : last ? `${first} ${last}.` : first,
    initials: deleted ? '' : (first[0]!.toUpperCase() + last).slice(0, 2),
    institution: deleted ? null : r.author_institution?.trim() || null,
    createdAt: r.created_at,
    rating: Math.min(5, Math.max(1, Math.round(r.session_value))),
    topic: r.session_type?.name ?? null,
    text: guest ? '' : r.public_review,
  };
}

export function toReviewPrompt(r: MentorRelationshipRead): ReviewPrompt {
  if (r.review_due) return 'due';
  if (r.completed_sessions_with_mentor === 0) return 'none';
  return null;
}

// ---- hooks ------------------------------------------------------------------

export type MentorReviewsResult = {
  reviews: Review[];
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: AppError | null;
  loadMore: () => void;
};

/**
 * GET /api/v1/mentors/{handle}/reviews, newest first, five a page.
 * `sessionTypeId`: the filter chip (null = all). A guest gets one review,
 * without its text. `active`: the list is on screen. `ready`: who is looking
 * is known (guest or not decides what's fetched); until then an active list
 * reads as loading, never as empty.
 */
export function useMentorReviews(
  handle: string,
  sessionTypeId: string | null,
  { guest, active, ready }: { guest: boolean; active: boolean; ready: boolean },
): MentorReviewsResult {
  const session = useSession();
  const qc = useQueryClient();
  const key = keys.mentors.reviews(
    handle,
    sessionTypeId ?? 'all',
    guest ? 'guest' : sessionKey(session),
  );
  const canFetch = active && ready && session.status !== 'unknown';
  const query = useInfiniteQuery({
    queryKey: key,
    enabled: canFetch,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const { data, error, response } = await api.GET('/api/v1/mentors/{handle}/reviews', {
        params: {
          path: { handle },
          query: {
            session_type: sessionTypeId ?? undefined,
            cursor: pageParam,
            limit: guest ? 1 : REVIEW_PAGE_SIZE,
          },
        },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return {
        reviews: data.data.map((r) => toReview(r, guest)),
        // A guest never pages: the sign-up card stands in for the rest.
        next: guest ? undefined : (data.next_cursor ?? undefined),
      };
    },
    getNextPageParam: (last) => last.next,
    staleTime: 60_000,
    networkMode: 'always',
    retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 1,
  });

  const pages = query.data?.pages ?? [];
  const nextFailed = query.isFetchNextPageError;

  const loadMore = useCallback(async () => {
    const res = await query.fetchNextPage();
    // A cursor the server no longer honours (422): start again from page 1,
    // as the Explore list does (contract: 422 on a list = bad cursor).
    if (res.isFetchNextPageError && res.error instanceof ApiError && res.error.status === 422) {
      await qc.resetQueries({ queryKey: key, exact: true });
    }
  }, [query, qc, key]);

  return {
    reviews: pages.flatMap((p) => p.reviews),
    isLoading: active && (!canFetch || query.isPending),
    error: query.isError && !nextFailed ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreError: nextFailed ? normaliseError(query.error) : null,
    loadMore: () => void loadMore(),
  };
}

/**
 * GET /api/v1/me/mentors/{mentor_id}/relationship → the review note. Members
 * only. A failure says nothing: the note is a nudge, not content.
 */
export function useReviewPrompt(mentorId: string | null, enabled: boolean): ReviewPrompt {
  const session = useSession();
  const query = useQuery({
    queryKey: keys.mentors.relationship(mentorId ?? '', sessionKey(session)),
    enabled: enabled && !!mentorId && session.status !== 'unknown',
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET(
        '/api/v1/me/mentors/{mentor_id}/relationship',
        { params: { path: { mentor_id: mentorId! } }, signal },
      );
      if (!data) throw apiError(response.status, error);
      return toReviewPrompt(data);
    },
    staleTime: 60_000,
    retry: false,
  });
  return enabled ? (query.data ?? null) : null;
}
