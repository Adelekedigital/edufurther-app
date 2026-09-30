import type { BookingDay } from '@/types/mentor';

/**
 * How far ahead booking looks when a session type doesn't say: four weeks.
 * Otherwise it's the type's own window (its effective booking window), shown a
 * week at a time in one /slots request.
 */
export const DEFAULT_HORIZON_DAYS = 28;
/** Pages of seven days the modal offers for a window: 1 for 7 days, 8 for 56. */
export const weeksIn = (horizonDays: number) => Math.max(1, Math.ceil(horizonDays / 7));

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
 * Which 7-day page (0 = the one starting today) holds `instant`, in the
 * viewer's zone. Negative for a day before today.
 */
export function weekIndexOf(instant: string, timeZone: string, now = new Date()): number {
  const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
  const diff = Math.round(
    (day(dayKey(instant, timeZone)) - day(dayKey(now.toISOString(), timeZone))) / 864e5,
  );
  return Math.floor(diff / 7);
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
  horizonDays = Infinity,
): BookingDay[] {
  const today = dayKey(now.toISOString(), timeZone);
  const byDate = new Map(days.map((d) => [d.date, d.slots]));
  // The last page stops at the window's end: days past it aren't "no open
  // times", they can't be booked at all (a 10-day window: 7, then 3).
  const count = Math.max(0, Math.min(7, horizonDays - week * 7));
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, week * 7 + i);
    return { date, slots: byDate.get(date) ?? [] };
  });
}

/**
 * The dates to ask /slots for, so the window's days on screen are covered.
 * The picker shows the viewer's today … the window's last day in the viewer's
 * zone, but `start`/`end` are dates the backend reads in the mentor's zone,
 * which can be a day either side. The end gets that day's margin. The start
 * needs none: notice is at least 24 hours, so nothing before the viewer's
 * tomorrow is bookable in any zone. That keeps the range at the window plus
 * one day, which the backend allows (its maximum window plus one).
 */
export function slotWindow(
  timeZone: string,
  horizonDays = DEFAULT_HORIZON_DAYS,
  now = new Date(),
): { start: string; end: string } {
  const today = dayKey(now.toISOString(), timeZone);
  return { start: today, end: addDays(today, horizonDays + 1) };
}

/** Only the days the picker can show: today … the window's last day, in the viewer's zone. */
export function visibleDays(
  days: readonly BookingDay[],
  timeZone: string,
  now = new Date(),
  horizonDays = DEFAULT_HORIZON_DAYS,
): BookingDay[] {
  const first = dayKey(now.toISOString(), timeZone);
  const last = addDays(first, horizonDays - 1);
  return days.filter((d) => d.date >= first && d.date <= last);
}
