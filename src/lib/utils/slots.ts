import type { BookingDay } from '@/types/mentor';

/**
 * How far ahead booking looks: four weeks, one /slots request (the backend
 * allows 56 days). The modal shows it a week at a time.
 */
export const BOOKING_HORIZON_DAYS = 28;
export const BOOKING_WEEKS = BOOKING_HORIZON_DAYS / 7;

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

/** A calendar date (YYYY-MM-DD) plus n days. Pure date arithmetic, no zone. */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Week `week` (0 = the next 7 days from today in the viewer's zone), every
 * day present — days with nothing open have no slots and render disabled.
 */
export function weekOfDays(
  days: readonly BookingDay[],
  week: number,
  timeZone: string,
  now = new Date(),
): BookingDay[] {
  const today = dayKey(now.toISOString(), timeZone);
  const byDate = new Map(days.map((d) => [d.date, d.slots]));
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, week * 7 + i);
    return { date, slots: byDate.get(date) ?? [] };
  });
}

/**
 * The dates to ask /slots for, so the four weeks on screen are always covered.
 * The picker shows the viewer's today … today+27 in the viewer's zone, but
 * `start`/`end` are calendar dates the backend reads in the mentor's zone —
 * which can be a day either side. A day's margin on each end (30 days, one
 * request; the backend allows 56) covers every zone pair; `visibleDays` then
 * drops whatever falls outside the four weeks.
 */
export function slotWindow(timeZone: string, now = new Date()): { start: string; end: string } {
  const today = dayKey(now.toISOString(), timeZone);
  return { start: addDays(today, -1), end: addDays(today, BOOKING_HORIZON_DAYS + 1) };
}

/** Only the days the picker can show: today … today+27 in the viewer's zone. */
export function visibleDays(
  days: readonly BookingDay[],
  timeZone: string,
  now = new Date(),
): BookingDay[] {
  const first = dayKey(now.toISOString(), timeZone);
  const last = addDays(first, BOOKING_HORIZON_DAYS - 1);
  return days.filter((d) => d.date >= first && d.date <= last);
}
