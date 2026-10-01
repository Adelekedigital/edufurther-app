import { addDays } from './slots';
import {
  resolveDefaults,
  windowLabel,
  type BookingDefaults,
  type DayHours,
} from './sessionTypeDraft';

/** Minutes of open hours across the week (days that are on). */
export function weeklyMinutes(days: DayHours[]): number {
  let total = 0;
  for (const d of days) if (d.on) for (const [a, b] of d.slots) if (b > a) total += b - a;
  return total;
}

/** Calendar v2 `weeklySummary`: "7.5 hrs a week · 3 days", or "No hours set". */
export function weeklyTotal(days: DayHours[]): string {
  const open = days.filter((d) => d.on).length;
  if (!open) return 'No hours set';
  const hours = Math.round(weeklyMinutes(days) / 6) / 10;
  return `${hours} hrs a week · ${open} day${open > 1 ? 's' : ''}`;
}

/** How many sessions of `durationMin` the week's hours fit, slot by slot (a session can't span two). */
export function slotCount(days: DayHours[], durationMin: number): number {
  let n = 0;
  for (const d of days)
    if (d.on) for (const [a, b] of d.slots) if (b > a) n += Math.floor((b - a) / durationMin);
  return n;
}

/** Calendar v2 notice labels: "24 hours", "2 days". */
export const noticeLabel = (hours: number) =>
  hours >= 48 && hours % 24 === 0
    ? `${hours / 24} days`
    : `${Number(hours.toFixed(1))} hour${hours === 1 ? '' : 's'}`;

/** Calendar v2 `windowSummary`: "60 min sessions · at least 24 hours notice · up to 8 weeks ahead · 15 min break". */
export function windowSummary(d: BookingDefaults): string {
  const r = resolveDefaults(d);
  const windowDays = d.maxWindowDays ? Math.min(r.windowDays, d.maxWindowDays) : r.windowDays;
  return [
    `${r.durationMin} min sessions`,
    `at least ${noticeLabel(r.noticeHours)} notice`,
    `up to ${windowLabel(windowDays)} ahead`,
    r.breakMin ? `${r.breakMin} min break` : 'no break',
  ].join(' · ');
}

/** Today's date (YYYY-MM-DD) in `timeZone`. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

export type MonthCell =
  | { kind: 'pad' }
  | {
      kind: 'day';
      iso: string;
      day: number;
      weekday: number;
      past: boolean;
      today: boolean;
      selected: boolean;
      /** Part of a run of selected days: its band joins the neighbours'. */
      joinPrev: boolean;
      joinNext: boolean;
      booked: boolean;
      /** A weekday with open hours, not past and not selected (design `open`). */
      open: boolean;
    };

/** The first day (YYYY-MM-01) of the month `offset` months after `today`'s. */
export function monthStart(today: string, offset: number): string {
  const [y, m] = today.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * MonthPicker.dc.html's cells for one month: blanks before the 1st (Sunday
 * first), then each day. A selected run joins within a week only, as drawn.
 */
export function monthCells(p: {
  month: string;
  today: string;
  min?: string;
  selected: readonly string[];
  booked: readonly string[];
  /** Weekdays (0 = Sunday) with open hours; absent: no day is marked open. */
  available?: readonly number[];
  /** Only days in this range can be open (minimum notice to the booking window). */
  openFrom?: string;
  openUntil?: string;
}): MonthCell[] {
  const sel = new Set(p.selected);
  const booked = new Set(p.booked);
  const avail = p.available ? new Set(p.available) : null;
  const min = p.min ?? p.today;
  const first = new Date(`${p.month}T12:00:00Z`);
  const lead = first.getUTCDay();
  const cells: MonthCell[] = Array.from({ length: lead }, () => ({ kind: 'pad' as const }));
  const length = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  for (let n = 1; n <= length; n++) {
    const iso = addDays(p.month, n - 1);
    const weekday = (lead + n - 1) % 7;
    const past = iso < min;
    const selected = sel.has(iso);
    cells.push({
      kind: 'day',
      iso,
      day: n,
      weekday,
      past,
      today: iso === p.today,
      selected,
      joinPrev: selected && n > 1 && weekday > 0 && sel.has(addDays(iso, -1)),
      joinNext: selected && n < length && weekday < 6 && sel.has(addDays(iso, 1)),
      booked: booked.has(iso),
      open:
        !!avail &&
        !past &&
        !selected &&
        avail.has(weekday) &&
        (!p.openFrom || iso >= p.openFrom) &&
        (!p.openUntil || iso <= p.openUntil),
    });
  }
  return cells;
}

/**
 * The days a mentee could book in, in the mentor's zone: from the first day
 * minimum notice allows to the last day of the booking window.
 */
export function bookableRange(today: string, d: BookingDefaults): { from: string; until: string } {
  const r = resolveDefaults(d);
  const windowDays = d.maxWindowDays ? Math.min(r.windowDays, d.maxWindowDays) : r.windowDays;
  return {
    from: addDays(today, Math.floor(r.noticeHours / 24)),
    until: addDays(today, windowDays),
  };
}
