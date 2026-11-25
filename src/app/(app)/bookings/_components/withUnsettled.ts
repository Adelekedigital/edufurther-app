import { byNewestFirst } from '@/lib/utils/bookings';
import type { Booking, BookingStatus } from '@/types/booking';

/**
 * History with the joined, past-end sessions whose outcome has not landed yet
 * (`useUnsettledRejoins`), so their Rejoin is still reachable. Only when no
 * filter is on, or Completed is: what they will most likely become. A row
 * History already has is not added twice. Kept with Bookings, its one user,
 * rather than in the helpers every page ships with.
 */
export function withUnsettled(
  history: Booking[],
  unsettled: readonly Booking[],
  filters: readonly BookingStatus[],
): Booking[] {
  if (!unsettled.length || (filters.length > 0 && !filters.includes('completed'))) return history;
  const have = new Set(history.map((b) => b.id));
  const extra = unsettled.filter((b) => !have.has(b.id));
  return extra.length ? [...extra, ...history].sort(byNewestFirst) : history;
}
