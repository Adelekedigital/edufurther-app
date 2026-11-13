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

/** The hour of an instant in `timeZone`, 0–23 (h23, so midnight is 0, never 24). */
export function hourIn(isoInstant: string, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(
      new Date(isoInstant),
    ),
  );
}

/**
 * Early-morning hours, start inclusive, end exclusive (00:00 to 08:59). Legacy
 * data: sessions at 00:00 to 09:00 Lagos time had 68% no-shows, so the booking
 * modal flags a time in this window, in the mentee's own zone (roadmap, 2026-11-13).
 */
export const EARLY_MORNING_HOURS = { from: 0, to: 9 } as const;

/** Whether an instant falls in `EARLY_MORNING_HOURS` in `timeZone`. */
export function isEarlyMorning(isoInstant: string, timeZone: string): boolean {
  const h = hourIn(isoInstant, timeZone);
  return h >= EARLY_MORNING_HOURS.from && h < EARLY_MORNING_HOURS.to;
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
 * and two zones' dates can differ by two days (UTC−12 against UTC+14). So two
 * days of margin before today, and `end` (exclusive) three days past the
 * window: the gap needs only two there, the third is the padding the backend
 * recommends (#312). The window plus five days, which it allows (its maximum
 * plus five).
 */
export function slotWindow(
  timeZone: string,
  horizonDays = DEFAULT_HORIZON_DAYS,
  now = new Date(),
): { start: string; end: string } {
  const today = dayKey(now.toISOString(), timeZone);
  return { start: addDays(today, -2), end: addDays(today, horizonDays + 3) };
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
