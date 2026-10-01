'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { addDays, dayKey } from '@/lib/utils/slots';
import type { Remote } from '@/types/mentor';
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
export async function fetchBookedStarts(
  userId: string,
  signal?: AbortSignal,
  now = Date.now(),
): Promise<string[]> {
  const cutoff = now - DAY_MS;
  const starts: string[] = [];
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
      if (s.mentor_id === userId && ACTIVE.includes(s.status)) starts.push(s.starts_at);
    }
    if (older || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return starts;
}

/** Days (YYYY-MM-DD, in `timeZone`) the mentor has a session booked on. */
export function useBookedDays(userId: string | null, timeZone: string): Remote<string[]> {
  const query = useQuery({
    queryKey: keys.bookedSessions(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: ({ signal }) => fetchBookedStarts(userId!, signal),
    staleTime: 60 * 1000,
  });
  const days = useMemo(
    () => (query.data ? [...new Set(query.data.map((at) => dayKey(at, timeZone)))] : null),
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

/** GET /users/{id}/availability/exceptions → the whole days the mentor blocked. */
export function useBlockedDays(userId: string | null): Remote<string[]> {
  const query = useQuery({
    queryKey: keys.blockedDays(userId ?? 'none'),
    enabled: userId !== null,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET(
        '/api/v1/users/{user_id}/availability/exceptions',
        { params: { path: { user_id: userId! } }, signal },
      );
      if (!data) throw apiError(response.status, error);
      return blockedDaysOf(data);
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
