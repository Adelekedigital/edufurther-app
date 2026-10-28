import { dayLabel, formatShortDate, formatTime } from './format';

/**
 * Calendar days from `now` back to `at` in `timeZone`: 0 today, 1 yesterday.
 * Counted by calendar date, not 24-hour steps, so 11:59 pm and 12:01 am are a day apart.
 */
export function daysAgo(isoInstant: string, timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const dayNumber = (d: Date) => {
    const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year!, p.month! - 1, p.day!) / 86_400_000;
  };
  return dayNumber(now) - dayNumber(new Date(isoInstant));
}

function weekday(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(
    new Date(isoInstant),
  );
}

/**
 * A chat row's time (PRD Q4): the time today, "Yesterday", the weekday within
 * the last week, then the date ("Oct 13", the app's short date).
 */
export function rowTime(isoInstant: string, timeZone: string, now = new Date()): string {
  const d = daysAgo(isoInstant, timeZone, now);
  if (d <= 0) return formatTime(isoInstant, timeZone);
  if (d === 1) return 'Yesterday';
  if (d < 7) return weekday(isoInstant, timeZone);
  return formatShortDate(isoInstant, timeZone);
}

/**
 * A day separator in the thread (PRD Q4): "Today", "Yesterday", the weekday
 * within the last week, then "Mon, Oct 13" (the app's day label).
 */
export function separatorLabel(isoInstant: string, timeZone: string, now = new Date()): string {
  const d = daysAgo(isoInstant, timeZone, now);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return weekday(isoInstant, timeZone);
  return dayLabel(isoInstant, timeZone);
}

/** The calendar date of an instant in `timeZone`, for grouping messages by day. */
export function dayKey(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(isoInstant));
}
