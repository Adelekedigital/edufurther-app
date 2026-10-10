'use client';

import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { HISTORY_STATUSES, joinState, respondDeadline, safeMeetingUrl } from '@/lib/utils/bookings';
import { coverFor } from '@/lib/utils/cover';
import { dayKey } from '@/lib/utils/slots';
import type {
  Booking,
  BookingParty,
  BookingStatus,
  JoinResult,
  SessionRoom,
} from '@/types/booking';
import type { AppError, Remote } from '@/types/mentor';
import { ApiError, apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type SessionRead = components['schemas']['SessionRead'];
type PartyRead = components['schemas']['PartyRead'];
type ApiStatus = SessionRead['status'];

/**
 * Upcoming and Pending ask for `order=asc`, so one page is the *soonest*
 * fifty — the sessions a person is actually about to have. Beyond that the
 * screen stops, which is why neither tab offers paging; History does, because
 * it grows without limit and its newest-first order is the API's own.
 */
const PAGE = 50;
const HISTORY_PAGE = 20;

const STATUS: Record<ApiStatus, BookingStatus> = {
  pending_mentor_approval: 'pending',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
  declined: 'declined',
  expired: 'expired',
  no_show: 'noShow',
  withdrawn: 'withdrawn',
};
const API_STATUS = Object.fromEntries(
  Object.entries(STATUS).map(([api_, ours]) => [ours, api_ as ApiStatus]),
) as Record<BookingStatus, ApiStatus>;

/** Our status names as the query string wants them. */
export function toApiStatuses(statuses: readonly BookingStatus[]): ApiStatus[] {
  return statuses.map((s) => API_STATUS[s]);
}

export function toParty(p: PartyRead): BookingParty {
  const first = (!p.deleted && p.first_name?.trim()) || '';
  const last = (!p.deleted && p.last_name?.trim()) || '';
  const name = [first, last].filter(Boolean).join(' ');
  return {
    id: p.id,
    // A deleted account keeps its row — the session still happened — but loses
    // its name, as the reviews list already does.
    name: p.deleted || !name ? 'Deleted user' : name,
    // A live account with only a surname keeps it: the row says "Waiting for
    // Okafor to confirm", not "Waiting for Deleted user".
    firstName: p.deleted ? 'Deleted user' : first || name || 'Deleted user',
    initials: p.deleted ? '' : `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase(),
    avatarUrl: p.deleted ? null : (p.avatar_url ?? null),
    avatarFocus: p.deleted ? null : (p.avatar_focus ?? null),
    deleted: p.deleted ?? false,
    timeZone: p.deleted ? null : (p.timezone ?? null),
    cover: coverFor(p.id),
    degree: p.degree ?? null,
    institution: p.institution ?? null,
    joinedAt: p.joined_at ?? null,
    inRoomAt: p.in_room_at ?? null,
    attendance:
      p.attendance_status === 'attended'
        ? 'attended'
        : p.attendance_status === 'no_show'
          ? 'noShow'
          : p.attendance_status === 'left_early'
            ? 'leftEarly'
            : 'pending',
  };
}

/**
 * One API session as this screen reads it. Which side the viewer is on is
 * derived per row, not from their role: one account can host some of these and
 * have booked others (backend reply §2).
 */
export function toBooking(s: SessionRead, viewerId: string): Booking {
  const side = s.mentor_id === viewerId ? 'mentor' : 'mentee';
  const start = new Date(s.starts_at);
  return {
    id: s.id,
    status: STATUS[s.status],
    side,
    other: toParty(side === 'mentor' ? s.mentee : s.mentor),
    startsAt: s.starts_at,
    endsAt: new Date(start.getTime() + s.duration_minutes * 60_000).toISOString(),
    durationMin: s.duration_minutes,
    // The mentee's own words first; the offering's name is the fallback.
    title: s.topic?.trim() || s.session_type?.name?.trim() || null,
    sessionTypeId: s.session_type_id ?? s.session_type?.id ?? null,
    // Carried on every list row, so a page of twenty costs no extra requests.
    myAttendance: toParty(side === 'mentor' ? s.mentor : s.mentee).attendance,
    myJoinedAt: (side === 'mentor' ? s.mentor : s.mentee).joined_at ?? null,
    // The offer rides on the session, so a row carries it without a second call.
    suggestion: s.suggestion
      ? {
          id: s.suggestion.id,
          startsAt: s.suggestion.starts_at,
          // Derived, as `Booking.endsAt` is: the contract sends a length, not an end.
          endsAt: new Date(
            new Date(s.suggestion.starts_at).getTime() + s.suggestion.duration_minutes * 60_000,
          ).toISOString(),
          durationMin: s.suggestion.duration_minutes,
          heldUntil: s.suggestion.held_until,
          status: s.suggestion.status,
          bookedSessionId: s.suggestion.booked_session_id ?? null,
        }
      : null,
    answersPreview: s.answers_preview
      ? {
          count: s.answers_preview.count,
          first: {
            question: s.answers_preview.first.question_text,
            // Trimmed like `toAnswer` does, so the row and the panel cannot
            // word the same answer differently.
            text: s.answers_preview.first.text.trim(),
          },
        }
      : null,
    note: s.booking_message?.trim() || null,
    createdAt: s.created_at,
    respondBy: s.respond_by ?? null,
    joinOpensAt: s.join_opens_at ?? null,
    joinClosesAt: s.join_closes_at ?? null,
    doorClosesAt: s.door_closes_at ?? null,
    menteeAttendanceRate: s.mentee_attendance_rate ?? null,
    // Optional in the spec and defaulted, as the backend asked (#409).
    menteeAttendanceSessions: s.mentee_attendance_sessions ?? 0,
  };
}

async function fetchPage(
  userId: string,
  query: {
    status: ApiStatus[];
    limit: number;
    order?: 'asc' | 'desc';
    cursor?: string;
    from?: string;
  },
  signal?: AbortSignal,
) {
  const { data, error, response } = await api.GET('/api/v1/users/{user_id}/sessions', {
    params: { path: { user_id: userId }, query },
    signal,
  });
  if (!data) throw apiError(response.status, error);
  return { rows: data.data.map((s) => toBooking(s, userId)), next: data.next_cursor ?? undefined };
}

export function remote<T>(
  q: { data: T | undefined; isPending: boolean; isError: boolean; error: unknown },
  refetch: () => void,
  enabled: boolean,
): Remote<T> {
  return {
    data: q.data ?? null,
    isLoading: !enabled || q.isPending,
    error: q.isError ? normaliseError(q.error) : null,
    retry: refetch,
  };
}

/**
 * Confirmed sessions from today on, soonest first — the Upcoming tab, whose
 * first row is the hero.
 *
 * `accountZone` is the zone on the account (`/me timezone`), **not** the zone
 * the viewer picked for display: the backend reads `from` in the caller's own
 * zone (#326), so a display override would ask for the wrong day. It is in the
 * query key as well, because `from` is an input to the result — without it,
 * crossing midnight (or changing the account zone) would serve yesterday's
 * page for ever.
 */
export function useUpcomingBookings(
  userId: string | null,
  accountZone: string,
  active = true,
): Remote<Booking[]> {
  const session = useSession();
  const enabled = active && !!userId && session.status !== 'unknown';
  // Today, not now: a session that started an hour ago is still joinable for
  // fifteen minutes and must not vanish mid-session.
  const from = dayKey(new Date().toISOString(), accountZone);
  const query = useQuery({
    queryKey: keys.bookings.upcoming(sessionKey(session), from),
    enabled,
    queryFn: async ({ signal }) => {
      // Settled sessions too: the backend can rule a session completed or a
      // no-show while people are still in the call, and someone who drops out
      // then needs this row's Join to get back (backend #380). Only those
      // whose door is still open for the viewer stay; the rest are History's.
      const { rows } = await fetchPage(
        userId!,
        { status: ['confirmed', 'completed', 'no_show'], limit: PAGE, order: 'asc', from },
        signal,
      );
      const now = new Date();
      return rows.filter((r) => r.status === 'confirmed' || joinState(r, now) === 'open');
    },
    staleTime: 30_000,
    networkMode: 'always',
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

/**
 * Requests waiting on someone — the mentor's to answer, the mentee's to hear
 * back on. Soonest deadline first, so the one about to lapse is at the top.
 * Lapsed rows stay in the list (the sweep moves them within the hour); the UI
 * marks them rather than hiding a request the person may still be looking for.
 */
export function usePendingBookings(userId: string | null, active = true): Remote<Booking[]> {
  const session = useSession();
  const enabled = active && !!userId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.bookings.pending(sessionKey(session)),
    enabled,
    queryFn: async ({ signal }) => {
      const { rows } = await fetchPage(
        userId!,
        { status: ['pending_mentor_approval'], limit: PAGE, order: 'asc' },
        signal,
      );
      // Within the page, by deadline: a migrated request carries none and
      // lapses at its start, which `respondDeadline` already says.
      return rows.sort((a, b) => respondDeadline(a).localeCompare(respondDeadline(b)));
    },
    staleTime: 30_000,
    networkMode: 'always',
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

/**
 * One booking (GET /sessions/{id}). The backend confirms this returns exactly
 * what a list row holds, so the panel only reaches for it when the row is not
 * already loaded — a `?booking=` link opened cold, or a tab that has not
 * fetched. Opening the panel from the list costs no request at all.
 */
export function useBooking(
  id: string | null,
  userId: string | null,
  active: boolean,
): Remote<Booking> {
  const session = useSession();
  const enabled = active && !!id && !!userId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.bookings.one(id ?? '', sessionKey(session)),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/sessions/{session_id}', {
        params: { path: { session_id: id! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return toBooking(data, userId!);
    },
    staleTime: 30_000,
    networkMode: 'always',
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

export type BookingHistoryResult = {
  bookings: Booking[];
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: AppError | null;
  loadMore: () => void;
};

/**
 * Everything that is over, newest first — the API's own order, so this one
 * pages honestly. `statuses` is the filter chips; empty means all six.
 */
export function useBookingHistory(
  userId: string | null,
  statuses: readonly BookingStatus[],
  active = true,
): BookingHistoryResult {
  const session = useSession();
  const qc = useQueryClient();
  const wanted = statuses.length ? statuses : HISTORY_STATUSES;
  const key = keys.bookings.history(sessionKey(session), wanted);
  const enabled = active && !!userId && session.status !== 'unknown';
  const query = useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchPage(
        userId!,
        { status: toApiStatuses(wanted), limit: HISTORY_PAGE, cursor: pageParam },
        signal,
      ),
    getNextPageParam: (last) => last.next,
    staleTime: 60_000,
    networkMode: 'always',
    retry: retryOnce,
  });

  const nextFailed = query.isFetchNextPageError;
  const loadMore = useCallback(async () => {
    const res = await query.fetchNextPage();
    // A cursor the server no longer honours: start from page 1, as Explore does.
    if (res.isFetchNextPageError && res.error instanceof ApiError && res.error.status === 422) {
      await qc.resetQueries({ queryKey: key, exact: true });
    }
  }, [query, qc, key]);

  return {
    bookings: (query.data?.pages ?? []).flatMap((p) => p.rows),
    isLoading: !enabled || query.isPending,
    error: query.isError && !nextFailed ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreError: nextFailed ? normaliseError(query.error) : null,
    loadMore: () => void loadMore(),
  };
}

/**
 * POST /sessions/{id}/join. This call *is* the attendance record, so the UI
 * always goes through it: opening the session's own `meeting_url` marks nobody
 * present, and for EduFurther video the stored URL does not open the room at
 * all (backend reply §6). It returns a link minted for this caller.
 */
export function useJoinSession() {
  const qc = useQueryClient();
  return useMutation<JoinResult, ApiError, string>({
    mutationFn: async (sessionId) => {
      const { data, error, response } = await api.POST('/api/v1/sessions/{session_id}/join', {
        params: { path: { session_id: sessionId } },
      });
      if (!data) throw apiError(response.status, error);
      // Checked here, not at the call site, so an unsafe value can never reach
      // the view model. A `custom` venue is a mentor's own typed link — someone
      // else's text on our page — and gets the same treatment as a profile URL
      // (lib/utils/socialUrl). A rejected link reads as "no venue", which is
      // what it is.
      return { meetingUrl: safeMeetingUrl(data.meeting_url) };
    },
    onSuccess: (_result, sessionId) => {
      // The arrival is recorded now: say so in the open page at once, so a
      // second press before the re-read goes through the door rather than
      // /join again. The re-read below then brings the server's own time.
      const arrivedAt = new Date().toISOString();
      qc.setQueriesData<SessionRoom>({ queryKey: keys.bookings.roomAll(sessionId) }, (r) =>
        r && !r.me.joinedAt
          ? {
              ...r,
              me: { ...r.me, joinedAt: arrivedAt },
              booking: { ...r.booking, myJoinedAt: arrivedAt },
            }
          : r,
      );
      void qc.invalidateQueries({ queryKey: keys.bookings.all });
    },
  });
}

/**
 * POST /sessions/{id}/door: a way back into a running session's call for
 * someone who has already joined (backend #380). It records **no** attendance:
 * the first arrival goes through `useJoinSession`, every reconnect through
 * here, so the record keeps the first press. Open from `join_opens_at` until
 * `door_closes_at`; outside that, a 409. A `null` link on a 200 means there is
 * no way in right now, which the page says rather than treating as an error.
 */
export function useSessionDoor() {
  const qc = useQueryClient();
  return useMutation<JoinResult, ApiError, string>({
    mutationFn: async (sessionId) => {
      const { data, error, response } = await api.POST('/api/v1/sessions/{session_id}/door', {
        params: { path: { session_id: sessionId } },
      });
      if (!data) throw apiError(response.status, error);
      // The same check as Join: an unsafe link reads as "no way in".
      return { meetingUrl: safeMeetingUrl(data.meeting_url) };
    },
    onError: (e) => {
      // Refused as a late first arrival (backend #382): the server has no
      // Join press for this person, whatever our copy says, so re-read the
      // session; the page then shows the closed note, not Rejoin.
      if (e.type?.endsWith('/problems/join-window-closed'))
        void qc.invalidateQueries({ queryKey: keys.bookings.all });
    },
  });
}
