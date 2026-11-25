'use client';

import { useMemo } from 'react';
import { canRejoin } from '@/lib/utils/bookings';
import type { Booking } from '@/types/booking';
import { useUpcomingRows } from './bookings';

/**
 * Joined sessions past their scheduled end that the server still calls
 * `confirmed`: the settle at `join_closes_at` was lost. Upcoming has let them
 * go and History asks only for settled statuses, so History's Rejoin reads
 * them from here (GitHub review, PR 723). The Upcoming page's own entry: no
 * request of its own once that is warm.
 *
 * Its own module, not in `./bookings`: that one ships with every page, and
 * only Bookings needs this (performance budget, 350kB JS).
 */
export function useUnsettledRejoins(
  userId: string | null,
  accountZone: string,
  active: boolean,
  now: Date,
): Booking[] {
  const { query } = useUpcomingRows(userId, accountZone, active);
  const at = now.getTime();
  return useMemo(
    () => (query.data ?? []).filter((b) => b.status === 'confirmed' && canRejoin(b, new Date(at))),
    [query.data, at],
  );
}
