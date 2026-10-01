'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { runsOf } from '@/lib/utils/calendar';
import { addDays, dayKey } from '@/lib/utils/slots';
import type { AppError, Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

type SessionRead = components['schemas']['SessionRead'];
type ExceptionRead = components['schemas']['AvailabilityExceptionRead'];

/** A booked day: still happening, or waiting on the mentor. */
const ACTIVE: SessionRead['status'][] = ['confirmed', 'pending_mentor_approval'];
const PAGE = 50;
/** 500 sessions back is far past anything the month view shows. */
const MAX_PAGES = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The start instants of the mentor's upcoming booked sessions. The list is
 * newest first by start (backend `list_sessions`), so paging stops at the first
 * session that started before yesterday: everything after it is older.
 * PENDING BACKEND: swap for the `from`/`to`/`status` filter (calendar reply #3).
 */
export type BookedSession = { startsAt: string; mentee: string | null };

export async function fetchBookedStarts(
  userId: string,
  signal?: AbortSignal,
  now = Date.now(),
): Promise<BookedSession[]> {
  const cutoff = now - DAY_MS;
  const starts: BookedSession[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error, response } = await api.GET('/api/v1/users/{user_id}/sessions', {
      params: { path: { user_id: userId }, query: { limit: PAGE, cursor } },
      signal,
    });
    if (!data) throw apiError(response.status, error);
    let older = false;
    for (const s of data.data) {
      if (Date.parse(s.starts_at) < cutoff) {
        older = true;
        break;
      }
      if (s.mentor_id === userId && ACTIVE.includes(s.status))
        starts.push({
          startsAt: s.starts_at,
          mentee: (!s.mentee.deleted && s.mentee.first_name?.trim()) || null,
        });
    }
    if (older || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return starts;
}

/** A booked day (YYYY-MM-DD, in the shown zone) and who it's with. */
export type BookedDay = { day: string; mentee: string | null };

/** The days the mentor has a session booked on, in `timeZone`, one entry per session. */
export function useBookedDays(userId: string | null, timeZone: string): Remote<BookedDay[]> {
  const query = useQuery({
    queryKey: keys.calendar.booked(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: ({ signal }) => fetchBookedStarts(userId!, signal),
    staleTime: 60 * 1000,
  });
  const days = useMemo(
    () => query.data?.map((s) => ({ day: dayKey(s.startsAt, timeZone), mentee: s.mentee })) ?? null,
    [query.data, timeZone],
  );
  return {
    data: days,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * Whole days a `block` exception covers (`end_date` exclusive). A block with
 * times covers part of a day only, so the month doesn't mark the day blocked.
 */
export function blockedDaysOf(exceptions: ExceptionRead[]): string[] {
  const days = new Set<string>();
  for (const e of exceptions) {
    if (e.type !== 'block' || e.start_time || e.end_time) continue;
    // A year at most: a runaway range can't hang the page.
    for (let d = e.start_date, n = 0; d < e.end_date && n < 366; d = addDays(d, 1), n++)
      days.add(d);
  }
  return [...days].sort();
}

export type Blocked = { days: string[]; exceptions: ExceptionRead[] };

/** GET /users/{id}/availability/exceptions → the whole days the mentor blocked, and the rows. */
export function useBlockedDays(userId: string | null): Remote<Blocked> {
  const query = useQuery({
    queryKey: keys.calendar.blocked(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET(
        '/api/v1/users/{user_id}/availability/exceptions',
        { params: { path: { user_id: userId! } }, signal },
      );
      if (!data) throw apiError(response.status, error);
      return { days: blockedDaysOf(data), exceptions: data };
    },
    staleTime: 60 * 1000,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** The block rows that cover whole days (the ones the month view and the modal own). */
const wholeDayBlocks = (exceptions: ExceptionRead[]) =>
  exceptions.filter((e) => e.type === 'block' && !e.start_time && !e.end_time);

/**
 * What to delete and create so the whole-day blocks from `today` on are
 * exactly `wanted` (backend calendar reply #6: one block per run of days, a
 * run is split by deleting and recreating it).
 * - Days before today aren't the page's to change: they count as kept, so a
 *   past block, or one running through today, stays as it is.
 * - A block that loses a day is deleted; its other days from today on are
 *   recreated in the block's own zone. New days take `timeZone` (the hours').
 * - Part-day blocks and overrides are never touched.
 */
export function planBlockSave(
  exceptions: ExceptionRead[],
  wanted: readonly string[],
  today: string,
  timeZone: string,
) {
  const want = new Set(wanted);
  const covered = new Set<string>();
  const zoneOf = new Map<string, string>();
  const remove: ExceptionRead[] = [];
  for (const e of wholeDayBlocks(exceptions)) {
    const days = blockedDaysOf([e]);
    if (days.every((d) => d < today || want.has(d))) days.forEach((d) => covered.add(d));
    else {
      remove.push(e);
      for (const d of days) if (!zoneOf.has(d)) zoneOf.set(d, e.timezone);
    }
  }
  const byZone = new Map<string, string[]>();
  for (const d of want) {
    if (covered.has(d) || d < today) continue;
    const zone = zoneOf.get(d) ?? timeZone;
    byZone.set(zone, [...(byZone.get(zone) ?? []), d]);
  }
  const add = [...byZone].flatMap(([zone, days]) =>
    runsOf(days).map((r) => ({ ...r, timezone: zone })),
  );
  return { remove, add };
}

/**
 * Save the blocked days: delete first, then create the runs (a split block
 * keeps its zone; new days take `timeZone`, the mentor's hours zone). Separate requests, so a partial failure is
 * possible: the days are re-read either way and the error says so.
 */
export function useSaveBlockedDays(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<
    void,
    AppError,
    { exceptions: ExceptionRead[]; wanted: readonly string[]; today: string; timeZone: string }
  >({
    mutationFn: async ({ exceptions, wanted, today, timeZone }) => {
      const { remove, add } = planBlockSave(exceptions, wanted, today, timeZone);
      const path = { user_id: userId! };
      const removed = await Promise.all(
        remove.map((e) =>
          api
            .DELETE('/api/v1/users/{user_id}/availability/exceptions/{exception_id}', {
              params: { path: { ...path, exception_id: e.id } },
            })
            .then((x) => x.response.ok || x.response.status === 404)
            .catch(() => false),
        ),
      );
      const added = await Promise.all(
        add.map((r) =>
          api
            .POST('/api/v1/users/{user_id}/availability/exceptions', {
              params: { path },
              body: {
                type: 'block',
                start_date: r.start,
                end_date: r.end,
                start_time: null,
                end_time: null,
                timezone: r.timezone,
                reason: null,
              },
            })
            .then((x) => x.response.ok)
            .catch(() => false),
        ),
      );
      const results = [...removed, ...added];
      const failed = results.filter((x) => !x).length;
      if (failed) throw blockError(failed === results.length);
    },
    // Resolves once the days are read back, so the page shows what was saved.
    onSettled: async () => {
      // Slots, the profile's "Book {next open time}", cards' "Free {day}".
      void qc.invalidateQueries({ queryKey: ['booking'] });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      await qc.invalidateQueries({ queryKey: keys.calendar.blocked(userId ?? 'none') });
    },
  });
  return {
    save: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/** PROVISIONAL copy (calendar design request, PR 2). */
export function blockError(none: boolean): AppError {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return {
    kind: offline ? 'offline' : 'server',
    message: offline
      ? 'You’re offline, so we couldn’t save your dates. Try again when you reconnect.'
      : none
        ? 'We couldn’t save your blocked dates. Try again.'
        : 'Some of your dates didn’t save. Check them, then try again.',
  };
}
