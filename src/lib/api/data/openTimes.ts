'use client';

import { useQueries } from '@tanstack/react-query';
import { addDays, dayKey } from '@/lib/utils/slots';
import type { Remote } from '@/types/mentor';
import { fetchSlotStarts } from './booking';
import { normaliseError, retryOnce } from './errors';
import { keys } from './keys';
import { useOwnSessionTypes } from './sessionTypes';

/** The dashboard's "Available times, next 14 days" (PRD Mentor Home). */
export const OPEN_TIMES_DAYS = 14;

/**
 * Start times on offer in the window, counted once each: two live session
 * types that share a 10:00 start are one open time to a mentee. Pure.
 */
export function countOpenTimes(startsByType: readonly (readonly string[])[]): number {
  return new Set(startsByType.flat()).size;
}

/**
 * How many distinct start times the mentor has open from today through the
 * next 14 days, in their own zone, across every live session type. Each type's
 * slots are read in parallel (the same cache entry the booking picker uses for
 * that window), and the count waits for all of them: a partial sum would
 * understate it. A mentor with no live type has 0, with no slot request.
 */
export function useOpenTimesCount(mentorId: string, timeZone: string): Remote<number> {
  const types = useOwnSessionTypes(true);
  const live = (types.data ?? []).filter((t) => t.isLive && !t.pendingDeletion);
  const today = dayKey(new Date().toISOString(), timeZone);
  // `end` is exclusive: today plus 13 more days.
  const window = { start: today, end: addDays(today, OPEN_TIMES_DAYS) };
  const slots = useQueries({
    queries: live.map((t) => ({
      queryKey: [...keys.booking.slots(mentorId, t.id), window.start, window.end],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchSlotStarts(mentorId, t.id, window, signal),
      staleTime: 60 * 1000,
      // Like the other dashboard reads: one more go on a server error only, so
      // a failing row says so in seconds rather than after three backoffs.
      retry: retryOnce,
    })),
  });
  const failed = slots.find((q) => q.error);
  const error = types.error ?? (failed ? normaliseError(failed.error) : null);
  const settled = !!types.data && slots.every((q) => q.data);
  return {
    data: !error && settled ? countOpenTimes(slots.map((q) => q.data!)) : null,
    isLoading: !error && !settled,
    error,
    retry: () => {
      if (types.error) types.retry();
      slots.forEach((q) => q.error && void q.refetch());
    },
  };
}
