import type { AdminMentorRow, MentorTab, ShowUpTier } from '@/lib/api/data/adminMentors';
import { todayIn } from '@/lib/utils/calendar';

/**
 * Search, filters and sort for one loaded Mentors tab (Admin.dc.html
 * `renderVals` mentors). Pure: the screen keeps the state, this decides.
 */

export type DateFilter = 'all' | '7' | '30' | 'month' | 'older';
export type WaitFilter = 'any' | 'u3' | '3to7' | 'over7';
export type ShowUpFilter = 'all' | ShowUpTier | 'none';
export type SortKey = 'longest' | 'shortest' | 'newest' | 'oldest' | 'az' | 'za';

export type MentorFilters = {
  date: DateFilter;
  wait: WaitFilter;
  showUp: ShowUpFilter;
  /** null: the tab's default. */
  sort: SortKey | null;
};

export const NO_FILTERS: MentorFilters = { date: 'all', wait: 'any', showUp: 'all', sort: null };

/** Longest wait on Applications, newest elsewhere (PRD Filters). */
export const defaultSort = (tab: MentorTab): SortKey =>
  tab === 'applications' ? 'longest' : 'newest';

/** The date each tab is about: applied, approved, since (unlisted), decided. */
export function tabDate(tab: MentorTab, m: AdminMentorRow): string | null {
  if (tab === 'applications') return m.submittedAt;
  if (tab === 'approved') return m.approvedAt;
  if (tab === 'paused') return m.pausedAt;
  return m.decidedAt;
}

const DAY = 86_400_000;
const dayNumber = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`) / DAY;

/** Whole calendar days from the instant to today, in the viewer's zone. */
export function daysAgo(iso: string, zone: string, now = new Date()): number {
  return Math.round(dayNumber(todayIn(zone, now)) - dayNumber(todayIn(zone, new Date(iso))));
}

export function filtersActive(tab: MentorTab, f: MentorFilters): boolean {
  return (
    f.date !== 'all' ||
    f.wait !== 'any' ||
    f.showUp !== 'all' ||
    (f.sort !== null && f.sort !== defaultSort(tab))
  );
}

const dateOk = (d: DateFilter, iso: string | null, zone: string, now: Date) => {
  if (d === 'all' || !iso) return d === 'all';
  const n = daysAgo(iso, zone, now);
  if (d === '7') return n <= 7;
  if (d === '30') return n <= 30;
  if (d === 'older') return n > 30;
  return todayIn(zone, new Date(iso)).slice(0, 7) === todayIn(zone, now).slice(0, 7);
};

const waitOk = (w: WaitFilter, days: number) =>
  w === 'any' ? true : w === 'u3' ? days < 3 : w === '3to7' ? days >= 3 && days <= 7 : days > 7;

const showUpOk = (s: ShowUpFilter, m: AdminMentorRow) =>
  s === 'all' ? true : s === 'none' ? m.showUpTier === null : m.showUpTier === s;

export function matchesSearch(m: AdminMentorRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  return !needle || m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle);
}

/** The rows to show, in order. Search and filters run on the whole loaded tab. */
export function visibleMentors(
  rows: AdminMentorRow[],
  tab: MentorTab,
  q: string,
  f: MentorFilters,
  zone: string,
  now = new Date(),
): AdminMentorRow[] {
  const wait = (m: AdminMentorRow) => m.waitingDays ?? 0;
  const time = (m: AdminMentorRow) => {
    const d = tabDate(tab, m);
    return d ? Date.parse(d) : 0;
  };
  const by: Record<SortKey, (a: AdminMentorRow, b: AdminMentorRow) => number> = {
    longest: (a, b) => wait(b) - wait(a),
    shortest: (a, b) => wait(a) - wait(b),
    newest: (a, b) => time(b) - time(a),
    oldest: (a, b) => time(a) - time(b),
    az: (a, b) => a.name.localeCompare(b.name),
    za: (a, b) => b.name.localeCompare(a.name),
  };
  const sort = f.sort ?? defaultSort(tab);
  return rows
    .filter(
      (m) =>
        matchesSearch(m, q) &&
        dateOk(f.date, tabDate(tab, m), zone, now) &&
        (tab !== 'applications' || waitOk(f.wait, wait(m))) &&
        (tab !== 'approved' || showUpOk(f.showUp, m)),
    )
    .sort(by[sort]);
}

/** Waiting colour: amber from 3 days, red from 5 (PRD Table). */
export const waitTone = (days: number): 'danger' | 'warning' | null =>
  days >= 5 ? 'danger' : days >= 3 ? 'warning' : null;

/** The tier's Tag tone; none (no settled sessions) is grey. */
export const tierTone = (t: ShowUpTier | null) =>
  t === 'onTrack'
    ? 'success'
    : t === 'needsAttention'
      ? 'warning'
      : t === 'atRisk'
        ? 'danger'
        : 'pending';
