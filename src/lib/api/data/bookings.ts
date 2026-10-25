'use client';

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import {
  byNewestFirst,
  HISTORY_STATUSES,
  isLapsed,
  joinState,
  respondDeadline,
  wantsLapsed,
} from '@/lib/utils/bookings';
import { coverKey } from '@/lib/utils/cover';
import { clampFocus, personCover, personInitials } from '@/lib/utils/person';
import { dayKey } from '@/lib/utils/slots';
import type { Booking, BookingParty, BookingStatus } from '@/types/booking';
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

/** What a party is called once their account is gone, or when it has no name at all. */
export const DELETED_NAME = 'Deleted user';

export function toParty(p: PartyRead): BookingParty {
  const first = (!p.deleted && p.first_name?.trim()) || '';
  const last = (!p.deleted && p.last_name?.trim()) || '';
  const name = [first, last].filter(Boolean).join(' ');
  return {
    id: p.id,
    // A deleted account keeps its row — the session still happened — but loses
    // its name, as the reviews list already does.
    name: p.deleted || !name ? DELETED_NAME : name,
    // A live account with only a surname keeps it: the row says "Waiting for
    // Okafor to confirm", not "Waiting for Deleted user".
    firstName: p.deleted ? DELETED_NAME : first || name || DELETED_NAME,
    initials: p.deleted ? '' : personInitials(first, last),
    avatarUrl: p.deleted ? null : (p.avatar_url ?? null),
    avatarFocus: p.deleted ? null : clampFocus(p.avatar_focus),
    deleted: p.deleted ?? false,
    timeZone: p.deleted ? null : (p.timezone ?? null),
    // Their chosen cover (backend #511), else the one their id gives.
    // Redacted with the rest for a deleted account: the id's colour, never their chosen one.
    cover: personCover(p.id, coverKey(p.deleted ? null : p.cover_color)),
    // Redacted here like the name and the avatar, not merely expected to
    // arrive null: every other identifying field on a deleted account is
    // dropped locally rather than trusted to the server.
    degree: p.deleted ? null : (p.degree ?? null),
    institution: p.deleted ? null : (p.institution ?? null),
    joinedAt: p.joined_at ?? null,
    inRoomAt: p.in_room_at ?? null,
    inRoom: p.deleted ? null : (p.in_room ?? null),
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
    refundUntil: s.refund_until ?? null,
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
    as?: 'mentor' | 'mentee';
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
  as?: 'mentor' | 'mentee',
): Remote<Booking[]> {
  const session = useSession();
  const enabled = active && !!userId && session.status !== 'unknown';
  // Today, not now: a session that started an hour ago is still joinable for
  // fifteen minutes and must not vanish mid-session.
  const from = dayKey(new Date().toISOString(), accountZone);
  const query = useQuery({
    queryKey: keys.bookings.upcoming(sessionKey(session), from, as),
    enabled,
    queryFn: async ({ signal }) => {
      // `as=mentor`/`as=mentee` narrows the page to one side server-side, so a
      // dual-role viewer's soonest session for that side is never pushed off the
      // page by the other side's rows (and `as` is in the query key so the sides
      // don't share a cache entry).
      //
      // Settled sessions too: the backend can rule a session completed or a
      // no-show while people are still in the call, and someone who drops out
      // then needs this row's Join to get back (backend #380). Only those whose
      // door is still open for the viewer stay; the rest are History's.
      const { rows } = await fetchPage(
        userId!,
        { status: ['confirmed', 'completed', 'no_show'], limit: PAGE, order: 'asc', from, as },
        signal,
      );
      const now = new Date();
      // A session leaves "upcoming" at its scheduled end: a confirmed session is
      // kept only while it is still before `endsAt`, so a just-ended one settling
      // into completed/no-show vanishes here rather than lingering with no action.
      // Evaluated per read, not on a wall-clock tick, so the drop lands on the next
      // fetch — on the dashboard that is the focus/navigation refetch
      // (refetchOnWindowFocus), which is the common way the hero is seen again.
      // A still-open door keeps a mid-session row for re-entry regardless.
      return rows.filter(
        (r) =>
          (r.status === 'confirmed' && new Date(r.endsAt).getTime() > now.getTime()) ||
          joinState(r, now) === 'open',
      );
    },
    staleTime: 30_000,
    networkMode: 'always',
    retry: retryOnce,
  });
  return remote(query, () => void query.refetch(), enabled);
}

/**
 * Every open request, soonest deadline first — before the lapse is judged.
 *
 * Both tabs that show requests read this one entry: Pending keeps the ones
 * still waiting, History the ones that have lapsed. One key and one fetch, so
 * the two tabs partition the same snapshot and no row can be in both lists or
 * in neither.
 */
function usePendingRows(userId: string | null, enabled: boolean) {
  const session = useSession();
  return useQuery({
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
}

/**
 * Requests still waiting on someone — the mentor's to answer, the mentee's to
 * hear back on. Soonest deadline first, so the one about to lapse is at the top.
 *
 * A request nobody answered in time is **not** one of them: it is expired, and
 * expired belongs in History (owner, 2026-10-13). Backend #445 flips the stored
 * status within about 30 seconds of the deadline, so the API usually agrees
 * within moments — but not always (see `isLapsed`), and a row this dropped
 * without `useBookingHistory` picking it up would sit in neither tab. So the
 * two stay a pair: `isLapsed` decides here, and History reads the same rows.
 *
 * The lapse is judged when the list is read, not on every tick: a row is never
 * pulled out from under someone mid-read, and until the next read its own tag
 * already says "Expired".
 */
export function usePendingBookings(userId: string | null, active = true): Remote<Booking[]> {
  const session = useSession();
  const enabled = active && !!userId && session.status !== 'unknown';
  const query = usePendingRows(userId, enabled);
  const rows = query.data;
  const waiting = useMemo(() => rows?.filter((r) => !isLapsed(r)), [rows]);
  return remote(
    { data: waiting, isPending: query.isPending, isError: query.isError, error: query.error },
    () => void query.refetch(),
    enabled,
  );
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
 *
 * **Lapsed requests ride alongside the paged list, not inside it.** A request
 * past its deadline is expired and belongs here (owner, 2026-10-13), but for up
 * to an hour the API still files it under `pending_mentor_approval`, where no
 * status query reaches it. The obvious fix — add that status to the paged query
 * and drop the rows that have not lapsed — is the wrong one, because the
 * discards come out of the page: a `limit` of twenty can yield three rows, or
 * none at all, since `order=desc` sorts on `starts_at` and every still-waiting
 * request is future-dated, so they sit together at the front of page one. The
 * cursor itself stays sound (it is cut server-side, before we discard
 * anything), so nothing would be lost or repeated; what breaks is the page
 * *size* the screen counts on. A first page that discards everything renders
 * the empty state with `hasMore` true, and "Show more" fetches a page and adds
 * no rows — and since only `next_cursor === null` ends the list, a short page
 * cannot be told from the last one without asking again.
 *
 * So they are read as their own bounded list: one page of fifty, which is the
 * same request Pending already makes against the same cache entry, so on a warm
 * tab it costs no round trip. Arriving whole, before the first row paints, is
 * also what makes the merge sound — `byNewestFirst` is the server's own
 * comparator, so a rescued row lands where the page would have put it and stays
 * there as later pages append below it. The bound is the one Pending already
 * lives with (fifty open requests), and `hasMore` keeps meaning exactly what
 * the server said.
 *
 * A backend filter for "pending and past its deadline" would collapse this back
 * into one honest query; see the PR.
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

  // Only when the filters ask for `expired`, which an unfiltered History does:
  // otherwise these rows would show up under "Completed" too.
  const withLapsed = enabled && wantsLapsed(wanted);
  const pending = usePendingRows(userId, withLapsed);
  const pendingRows = pending.data;
  // Guarded on `withLapsed` as well as passed to the query: the entry may be
  // warm from the Pending tab, and a filter that excludes them must exclude
  // them whether or not they happen to be in the cache.
  const lapsed = useMemo(
    () => (withLapsed ? (pendingRows ?? []).filter((r) => isLapsed(r)) : []),
    [withLapsed, pendingRows],
  );
  const pages = query.data?.pages;
  const bookings = useMemo(
    () => [...lapsed, ...(pages ?? []).flatMap((p) => p.rows)].sort(byNewestFirst),
    [lapsed, pages],
  );

  const nextFailed = query.isFetchNextPageError;
  const loadMore = useCallback(async () => {
    const res = await query.fetchNextPage();
    // A cursor the server no longer honours: start from page 1, as Explore does.
    if (res.isFetchNextPageError && res.error instanceof ApiError && res.error.status === 422) {
      await qc.resetQueries({ queryKey: key, exact: true });
    }
  }, [query, qc, key]);

  return {
    bookings,
    // Both reads, so the expired rows are in place before the list paints
    // rather than dropping in above rows the person has started reading.
    isLoading: !enabled || query.isPending || (withLapsed && pending.isPending),
    // A failed rescue read is the tab's error, not a silent omission: a History
    // that quietly hides sessions is the bug being fixed here. Both reads hit
    // the same endpoint, so one failing alone is the unlikely case.
    error:
      query.isError && !nextFailed
        ? normaliseError(query.error)
        : withLapsed && pending.isError
          ? normaliseError(pending.error)
          : null,
    retry: () => {
      void query.refetch();
      if (withLapsed) void pending.refetch();
    },
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreError: nextFailed ? normaliseError(query.error) : null,
    loadMore: () => void loadMore(),
  };
}
