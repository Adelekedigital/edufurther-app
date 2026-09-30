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
import { sessionKey, useSession } from './session';

type MentorSummaryRead = components['schemas']['MentorSummaryRead'];

/**
 * Mentors per page. Product decision (2026-09-27): 10, so the list is quick to
 * scan and "Show more mentors" loads the rest. Design drew 24; backend default
 * is 10, max 50.
 */
export const MENTOR_PAGE_SIZE = 10;

// ---- mapping --------------------------------------------------------------

export function toneFor(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 6) + 1) as AvatarTone;
}

/** avatar_focus → a clamped 0–1 point, or null when absent or malformed. */
export function toFocus(f: { x: number; y: number } | null | undefined): Mentor['photoFocus'] {
  if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return { x: clamp(f.x), y: clamp(f.y) };
}

/**
 * Backend (reply round 3 #13): next_available_state says open / none / refreshing.
 * Only claim "none" when it says so; refreshing or absent → unknown, say nothing.
 */
export function nextAvailableState(
  state: string | null | undefined,
  at: string | null | undefined,
): Mentor['nextAvailableState'] {
  if (state === 'open' && at) return 'open';
  if (state === 'none') return 'none';
  return at ? 'open' : 'unknown';
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
    photoFocus: toFocus(r.avatar_focus),
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
    // PRODUCT RULE (2026-09-27): every session is free until paid sessions ship,
    // so every mentor offers free mentorship. When the backend adds a price summary
    // (has_free_session_type / min_price, backend request #3), derive it here.
    offer: 'free',
    nextAvailableAt: r.next_available_at ?? null,
    nextAvailableState: nextAvailableState(r.next_available_state, r.next_available_at),
    takingBookings: r.taking_bookings ?? true,
    originCountry: r.origin_country ?? null,
    studyCountry: r.primary_study_country ?? null,
    // `offerings` has a server default, so the spec marks it optional.
    topics: (r.offerings ?? []).map((o) => ({ slug: o.slug, label: o.display_name })),
  };
}

// ---- topics ---------------------------------------------------------------

export function useTopics() {
  const query = useQuery({
    queryKey: keys.topics.all,
    queryFn: async ({ signal }) => {
      // One generic catalogue endpoint; this is its service-offerings list.
      const { data, response } = await api.GET('/api/v1/catalog/{catalogue}', {
        params: { path: { catalogue: 'service-offerings' } },
        signal,
      });
      if (!data) throw new ApiError(response.status);
      // The slug is `code` on the shared lookup shape (backend reply #2). `code` is
      // nullable on LookupRead; an offering without one can't be filtered on, so skip it.
      return data.data.flatMap((l): Topic[] =>
        l.code ? [{ slug: l.code, label: l.display_name, id: l.id }] : [],
      );
    },
    // A closed taxonomy; it changes on deploys, not during a visit.
    staleTime: 60 * 60 * 1000,
  });
  return {
    topics: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
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
  const session = useSession();
  const query = useQuery({
    queryKey: keys.mentors.featured(sessionKey(session)),
    // Wait for the session: a signed-in mentor must never be featured to themselves.
    enabled: enabled && session.status !== 'unknown',
    queryFn: async ({ signal }): Promise<FeaturedMentor | null> => {
      const { data, response } = await api.GET('/api/v1/featured-mentor', { signal });
      if (!response.ok) throw new ApiError(response.status);
      if (!data) return null;
      // about_me is optional in the published spec: a mentor may not have written one.
      return { ...toMentor(data), bio: data.about_me?.trim() || null };
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
  const session = useSession();
  const key = keys.mentors.list(filters, sessionKey(session));

  const query = useInfiniteQuery({
    queryKey: key,
    // Wait for the session so a signed-in visitor doesn't fetch the guest list first.
    enabled: session.status !== 'unknown',
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
