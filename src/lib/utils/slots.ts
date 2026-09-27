import type { BookingDay } from '@/types/mentor';

/** The calendar date (YYYY-MM-DD) an instant falls on in `timeZone`. */
export function dayKey(isoInstant: string, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(isoInstant));
}

/**
 * Bookable instants → days, in the viewer's zone (the zone picker's value, not
 * the mentor's). The same instant can sit on different days for the mentor and
 * the viewer, so grouping happens here, after the zone is known — and again
 * whenever it changes. Days without a slot never appear; order is by time.
 */
export function groupSlotsByDay(instants: readonly string[], timeZone: string): BookingDay[] {
  const byDay = new Map<string, string[]>();
  for (const at of [...instants].sort()) {
    const key = dayKey(at, timeZone);
    const list = byDay.get(key);
    if (list) list.push(at);
    else byDay.set(key, [at]);
  }
  return Array.from(byDay, ([date, starts]) => ({
    date,
    slots: starts.map((startsAt) => ({ startsAt })),
  }));
}
