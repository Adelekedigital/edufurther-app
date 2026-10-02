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

/** Days (YYYY-MM-DD) as runs of consecutive days: `end` is exclusive, like a block's `end_date`. */
export function runsOf(days: readonly string[]): { start: string; end: string }[] {
  const sorted = [...new Set(days)].sort();
  const runs: { start: string; end: string }[] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.end === d) last.end = addDays(d, 1);
    else runs.push({ start: d, end: addDays(d, 1) });
  }
  return runs;
}

/** "Mon, Oct 12" (Calendar v2 `short`), for a calendar date. */
export function shortDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** "When will you be back?" choices (Calendar v2 `opts`). */
export type ReturnChoice = '1w' | '2w' | '1m' | 'custom' | 'indef';
export const RETURN_CHOICES: { key: ReturnChoice; label: string; days?: number }[] = [
  { key: '1w', label: '1 week', days: 7 },
  { key: '2w', label: '2 weeks', days: 14 },
  { key: '1m', label: '1 month', days: 30 },
  { key: 'custom', label: 'Pick a date' },
  { key: 'indef', label: 'Not sure yet' },
];

/**
 * The return date a choice means (YYYY-MM-DD in the mentor's zone): null for
 * "Not sure yet", undefined while "Pick a date" has no date yet.
 */
export function returnOnFor(
  choice: ReturnChoice,
  today: string,
  picked: string | null,
): string | null | undefined {
  if (choice === 'indef') return null;
  if (choice === 'custom') return picked ?? undefined;
  return addDays(today, RETURN_CHOICES.find((c) => c.key === choice)!.days!);
}

/** Calendar v2 `returnSummary` (reminder copy, product 2026-10-01). */
export const returnSummary = (back: string | null) =>
  back
    ? `We’ll remind you on ${shortDay(back)} to switch back.`
    : 'You’ll stay busy until you switch yourself back.';

/**
 * Calendar v2 `busyBody`. The date is only a reminder, so a mentor can still be
 * busy after it: then the copy says it has passed (PROVISIONAL, design request PR 3).
 */
export const busyBody = (back: string | null, today: string) =>
  back && back < today
    ? `Mentees can’t find or book you right now. Your return date, ${shortDay(back)}, has passed. Switch back when you’re ready. Sessions you already have stay booked.`
    : back
      ? `Mentees can’t find or book you right now. We’ll remind you on ${shortDay(back)} to switch back. Sessions you already have stay booked.`
      : 'Mentees can’t find or book you right now. Sessions you already have stay booked. Switch back whenever you’re ready.';

/** The busy pill's hint: "Back Thu, Oct 8", "Return date passed", "No return date". */
export const busyHint = (back: string | null, today: string) =>
  !back ? 'No return date' : back < today ? 'Return date passed' : `Back ${shortDay(back)}`;

/** Calendar v2 `doneBody`. */
export const doneBody = (back: string | null) =>
  back
    ? `You’re set as busy. We’ll remind you on ${shortDay(back)} to switch back to available.`
    : 'You’re set as busy until you switch yourself back to available.';

/** Booked days a busy stretch covers: from today up to (not including) the return day. */
export function sessionsWhileBusy<T extends { day: string }>(
  booked: readonly T[],
  today: string,
  back: string | null,
): T[] {
  return booked.filter((b) => b.day >= today && (back === null || b.day < back));
}
