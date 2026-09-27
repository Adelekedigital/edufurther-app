'use client';

import { useCallback, useState } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, AvatarTone, FeaturedMentor, Mentor, Topic } from '@/types/mentor';
import { api } from './http';
import { ApiError, normaliseError } from './errors';
import { keys, type MentorFilters } from './keys';
import { deriveLabel } from './labels';

type MentorSummaryRead = components['schemas']['MentorSummaryRead'];

/** Design page size (Design decisions §3). Backend max is 50. */
export const MENTOR_PAGE_SIZE = 24;

// ---- mapping --------------------------------------------------------------

function toneFor(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 6) + 1) as AvatarTone;
}

export function toMentor(r: MentorSummaryRead): Mentor {
  const first = r.first_name?.trim() || '';
  const last = r.last_name?.trim() || '';
  const name = [first, last].filter(Boolean).join(' ') || 'EduFurther mentor';
  const initials =
    ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || name.slice(0, 1).toUpperCase();
  const degreeLine = [r.degree, r.study_course].filter(Boolean).join(', ') || null;
  const rating = r.session_value ?? null;
  return {
    id: r.id,
    profileHref: `/mentors/${encodeURIComponent(r.slug || r.id)}`,
    name,
    firstName: first || name.split(' ')[0] || name,
    initials,
    photoUrl: r.avatar_url ?? null,
    tone: toneFor(r.id),
    degreeLine,
    institution: r.institution ?? null,
    completedSessions: r.completed_sessions,
    reviewCount: r.review_count,
    rating,
    label: deriveLabel({
      rating,
      reviewCount: r.review_count,
      completedSessions: r.completed_sessions,
    }),
    nextAvailableAt: r.next_available_at ?? null,
    topics: r.offerings.map((o) => ({ slug: o.slug, label: o.display_name })),
  };
}

// ---- topics ---------------------------------------------------------------

export function useTopics() {
  const query = useQuery({
    queryKey: keys.topics.all,
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET('/api/v1/catalog/service-offerings', { signal });
      if (!data) throw new ApiError(response.status);
      // The slug is `code` on the shared lookup shape (backend reply #2).
      return data.data.map((l): Topic => ({ slug: l.code, label: l.display_name }));
    },
    // A closed taxonomy; it changes on deploys, not during a visit.
    staleTime: 60 * 60 * 1000,
  });
  return {
    topics: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? normaliseError(query.error) : null,
  };
}

// ---- featured -------------------------------------------------------------

/**
 * "Featured this week". GET /api/v1/featured-mentor — shape settled in backend reply
 * round 2 #11 (200 with the mentor, or 200 with null), not built yet; the phase A
 * mock serves it.
 * Any failure hides the card: it is a nice-to-have, never a page error.
 */
export function useFeaturedMentor(enabled: boolean) {
  const query = useQuery({
    queryKey: keys.mentors.featured,
    enabled,
    queryFn: async ({ signal }): Promise<FeaturedMentor | null> => {
      const { data, response } = await api.GET('/api/v1/featured-mentor', { signal });
      if (!response.ok) throw new ApiError(response.status);
      if (!data) return null;
      return { ...toMentor(data), bio: data.about_me };
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  return { featured: query.data ?? null, isLoading: enabled && query.isPending };
}

// ---- mentors --------------------------------------------------------------

export type MentorsResult = {
  mentors: Mentor[];
  /** Nothing on screen yet. */
  isLoading: boolean;
  /** Matching mentors across all pages, when the server sent it. */
  total: number | null;
  /** Filters changed with results on screen. */
  isRefreshing: boolean;
  error: AppError | null;
  retry: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: AppError | null;
  loadMore: () => void;
  /** The server rejected our cursor, so the list restarted from page 1. */
  restarted: boolean;
  dismissRestarted: () => void;
};

export function useMentors(filters: MentorFilters): MentorsResult {
  const qc = useQueryClient();
  const [restarted, setRestarted] = useState(false);
  const key = keys.mentors.list(filters);

  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const { data, response } = await api.GET('/api/v1/mentors', {
        params: {
          query: {
            q: filters.q || undefined,
            offering: filters.offerings.length ? filters.offerings : undefined,
            cursor: pageParam,
            limit: MENTOR_PAGE_SIZE,
          },
        },
        signal,
      });
      if (!data) throw new ApiError(response.status);
      return {
        mentors: data.data.map(toMentor),
        next: data.next_cursor ?? undefined,
        // First page only (backend reply #7); later pages omit it.
        total: data.total,
      };
    },
    getNextPageParam: (last) => last.next,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // Fail rather than pause when offline: a paused first load would show
    // skeletons forever; a failure shows the offline error state.
    networkMode: 'always',
    // Pages beyond the first retry by hand ("Try again"), not silently.
    retry: (count, err) => !(err instanceof ApiError && err.status === 422) && count < 1,
  });

  const pages = query.data?.pages ?? [];
  const mentors = pages.flatMap((p) => p.mentors);
  const pageCount = pages.length;
  const total = pages[0]?.total ?? null;
  const nextFailed = query.isFetchNextPageError;

  const loadMore = useCallback(async () => {
    const res = await query.fetchNextPage();
    // A cursor the server no longer honours (422) — start again from the top
    // and say why (Design decisions §5, "restarted").
    if (res.isFetchNextPageError && res.error instanceof ApiError && res.error.status === 422) {
      setRestarted(true);
      await qc.resetQueries({ queryKey: key, exact: true });
    }
  }, [query, qc, key]);

  const firstPageError = query.isError && !nextFailed ? normaliseError(query.error) : null;

  return {
    mentors,
    total,
    isLoading: query.isPending,
    isRefreshing: query.isPlaceholderData && query.isFetching,
    error: firstPageError,
    retry: () => void query.refetch(),
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreError: nextFailed && pageCount > 0 ? normaliseError(query.error) : null,
    loadMore: () => void loadMore(),
    restarted,
    dismissRestarted: () => setRestarted(false),
  };
}
