import type { PlaceRow } from '@/lib/api/data/adminAnalytics';
import { shareOf } from '@/lib/utils/analytics';

/**
 * Pure models behind the Supply and Growth tabs (Admin Analytics.dc.html):
 * the sort, the shares and the chart geometry, kept apart so they're tested
 * without rendering.
 */

/** The table's rows: places with no bookable mentor first, then mentees per mentor, highest first; five at most. */
export function rankPlaces(
  rows: readonly PlaceRow[],
  max = 5,
): (PlaceRow & { ratio: number | null })[] {
  return (
    rows
      // A place nobody wants to go has nothing to rank.
      .filter((r) => r.mentees > 0)
      .map((r) => ({ ...r, ratio: r.bookableMentors > 0 ? r.mentees / r.bookableMentors : null }))
      .sort((a, b) => {
        if (a.ratio === null || b.ratio === null) {
          if (a.ratio === b.ratio) return b.mentees - a.mentees;
          return a.ratio === null ? -1 : 1;
        }
        return b.ratio - a.ratio;
      })
      .slice(0, max)
  );
}

/** Each step as a share of the first (the bar), and of the step before (the conversion). */
export function steps<K extends string>(
  values: readonly { key: K; value: number }[],
): { key: K; value: number; width: number; conversion: number | null }[] {
  const first = values[0]?.value ?? 0;
  return values.map((s, i) => ({
    key: s.key,
    value: s.value,
    width: shareOf(s.value, first),
    conversion: i === 0 ? null : Math.round(shareOf(s.value, values[i - 1]!.value)),
  }));
}

/** "Nov", for a 'YYYY-MM' month. */
export const monthShort = (month: string) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });

/** The months chart: each bar's height as a share (0 to 1) of the tallest. */
export function monthBars(months: readonly { month: string; count: number }[], current: string) {
  const top = Math.max(0, ...months.map((m) => m.count));
  return months.map((m) => ({
    month: m.month,
    label: monthShort(m.month),
    count: m.count,
    share: top > 0 ? m.count / top : 0,
    soFar: m.month === current,
  }));
}

/** Rows of a share of completed sessions, the bar scaled to the largest. */
export function mixRows<T extends { key: string; count: number }>(
  rows: readonly T[],
  total: number,
) {
  const top = Math.max(0, ...rows.map((r) => r.count));
  return rows.map((r) => ({
    ...r,
    pct: Math.round(shareOf(r.count, total)),
    width: shareOf(r.count, top),
  }));
}
