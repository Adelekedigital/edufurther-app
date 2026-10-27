import { approvalShort } from '@/lib/copy/mentorSettings';
import { addDays } from './slots';
import {
  DAY_NAMES,
  MONDAY_FIRST,
  isOpenDay,
  resolveDefaults,
  shortTime,
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

/** Open hours across the week, to one decimal: 7.5. */
export const weeklyHours = (days: DayHours[]) => Math.round(weeklyMinutes(days) / 6) / 10;

/** Calendar v2 `weeklySummary`: "7.5 hrs a week · 3 days", or "No hours set". */
export function weeklyTotal(days: DayHours[]): string {
  const open = days.filter((d) => d.on).length;
  if (!open) return 'No hours set';
  const hours = weeklyHours(days);
  return `${hours} hrs a week · ${open} day${open > 1 ? 's' : ''}`;
}

/**
 * Calendar v2 `hoursSummary`, Monday first as `weeklySummary`: "Mon–Fri · 9 am–5 pm",
 * "Sat, Sun · times vary by day"; null with no hours.
 */
export function availabilitySummary(days: DayHours[]): string | null {
  // Position in the Monday-first week, so a weekend reads Fri–Sun.
  const on = MONDAY_FIRST.flatMap((day, pos) => (isOpenDay(days[day]) ? [{ day, pos }] : []));
  if (!on.length) return null;
  const runs: (typeof on)[] = [];
  for (const d of on) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1]!.pos === d.pos - 1) last.push(d);
    else runs.push([d]);
  }
  const name = (d: { day: number }) => DAY_NAMES[d.day]!.slice(0, 3);
  const dayStr = runs
    .map((r) =>
      r.length >= 3 ? `${name(r[0]!)}–${name(r[r.length - 1]!)}` : r.map(name).join(', '),
    )
    .join(', ');
  const first = days[on[0]!.day]!.slots;
  const same = on.every(({ day }) => JSON.stringify(days[day]!.slots) === JSON.stringify(first));
  const timeStr =
    same && first.length === 1
      ? `${shortTime(first[0]![0])}–${shortTime(first[0]![1])}`
      : 'times vary by day';
  return `${dayStr} · ${timeStr}`;
}

/** How many sessions of `durationMin` the week's hours fit, slot by slot (a session can't span two). */
export function slotCount(days: DayHours[], durationMin: number): number {
  let n = 0;
  for (const d of days)
    if (d.on) for (const [a, b] of d.slots) if (b > a) n += Math.floor((b - a) / durationMin);
  return n;
}

/** Calendar v2 notice labels: "24 hours", "2 days". */
export const noticeLabel = (hours: number) => {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`;
  // Judged on the shown number: 61 minutes reads "1 hour", not "1 hours".
  const n = Number(hours.toFixed(1));
  return `${n} hour${n === 1 ? '' : 's'}`;
};

/** The summary's short notice: "24 hrs", "1 hr", "2 days". */
const noticeShort = (hours: number) =>
  noticeLabel(hours).replace(/ hours?$/, (u) => (u === ' hour' ? ' hr' : ' hrs'));

/**
 * The mentor's booking rules on one line (Calendar v2 `windowSummary`, copy
 * research): "Confirmed straight away · 60 min · 24 hrs notice · 4 weeks
 * ahead · 15 min buffer". Calendar leads with approval; Sessions ends with it,
 * and its Review gives approval a row of its own (Session Types.dc.html, PRD
 * step 3 and 4).
 */
export function bookingRulesSummary(
  d: BookingDefaults,
  approval: 'first' | 'last' | 'none' = 'first',
): string {
  const r = resolveDefaults(d);
  const windowDays = d.maxWindowDays ? Math.min(r.windowDays, d.maxWindowDays) : r.windowDays;
  const rules = [
    `${r.durationMin} min`,
    `${noticeShort(r.noticeHours)} notice`,
    `${windowLabel(windowDays)} ahead`,
    r.breakMin ? `${r.breakMin} min buffer` : 'No buffer',
  ];
  const a = approvalShort(r.requiresApproval);
  const parts = approval === 'first' ? [a, ...rules] : approval === 'last' ? [...rules, a] : rules;
  return parts.join(' · ');
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

/** Whole months from `from`'s month to `to`'s (either any day in the month); negative if earlier. */
export function monthsBetween(from: string, to: string): number {
  return (
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
    Number(to.slice(5, 7)) -
    Number(from.slice(5, 7))
  );
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
  /** Exact days (YYYY-MM-DD) with open times, as read from the slots themselves. */
  openDays?: readonly string[];
}): MonthCell[] {
  const sel = new Set(p.selected);
  const booked = new Set(p.booked);
  const avail = p.available ? new Set(p.available) : null;
  const openDays = new Set(p.openDays);
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
        !past &&
        !selected &&
        (openDays.has(iso) ||
          (!!avail &&
            avail.has(weekday) &&
            (!p.openFrom || iso >= p.openFrom) &&
            (!p.openUntil || iso <= p.openUntil))),
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

/** The busy pill's hint (Calendar v2 `status.hint`): "Reminder Thu, Oct 8", "Return date passed", "No return date". */
export const busyHint = (back: string | null, today: string) =>
  !back ? 'No return date' : back < today ? 'Return date passed' : `Reminder ${shortDay(back)}`;

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

/**
 * The booked-sessions range to ask for (backend #326: account-zone dates, `to`
 * exclusive). From today to the furthest of: the end of every month on screen,
 * the booking window, and 90 days. One more day at the end: dots are drawn in
 * the hours' zone, which can be a day behind the account's (a session late on
 * the 31st there is already the 1st here).
 */
export function bookedRange(
  today: string,
  shownMonths: readonly (string | null)[],
  windowUntil: string | null,
): { from: string; to: string } {
  const ends = [
    addDays(today, 91),
    ...shownMonths.filter((m): m is string => !!m).map((m) => monthStart(m, 1)),
    ...(windowUntil ? [addDays(windowUntil, 1)] : []),
  ].sort();
  return { from: today, to: addDays(ends[ends.length - 1]!, 1) };
}
