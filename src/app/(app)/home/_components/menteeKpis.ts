import type { KpiTrend } from '@/components/molecules/KpiCard/KpiCard';
import type { MenteeStats } from '@/lib/api/data/menteeHome';

export type Kpi = {
  key: string;
  label: string;
  value: string | null;
  unit?: string;
  /** The ⓘ hint on the label row (Mentee Dashboard v2.dc.html HINT). */
  info?: string;
  trend?: KpiTrend;
  valueTone?: 'warning' | 'danger';
  /** A page link in the trend's place ("View missed"). */
  href?: { label: string; href: string };
};

/** "9", "9.5": hours without a trailing .0. */
export function formatHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const str = (n: number | null) => (n == null ? null : String(n));

/** Where "View missed" goes: Bookings History with the Missed filter on (Mentee Bookings owns the filter). */
export const MISSED_HREF = '/bookings?tab=history&filter=missed';

/**
 * The four progress tiles for a returning mentee, from /me/mentee-stats.
 *
 * Trends read "+N this month" as drawn when the backend sends the calendar
 * month (`thisMonth`); until then they fall back to the 30-day window's own
 * count ("N in the last 30 days", design-divergence.md). Never a
 * current-vs-previous delta: a decline would read as a discouraging negative.
 * Window lengths are read from the response, never hard-coded.
 */
export function returningKpis(s: MenteeStats): Kpi[] {
  const win = s.windowDays;
  const month = s.thisMonth;
  // Gate each trend on its all-time value being known too: a null value renders
  // "No data yet", and a trend under it would contradict the same card.
  const sessionsN = month ? month.sessions : s.current.sessions;
  const sessionsTrend: KpiTrend | undefined =
    s.sessionsHeld != null && sessionsN > 0
      ? {
          text: month ? `+${sessionsN} this month` : `${sessionsN} in the last ${win} days`,
          icon: 'trending_up',
          tone: 'positive',
        }
      : undefined;
  const hoursN = month ? month.hours : s.current.hours;
  const hoursTrend: KpiTrend | undefined =
    s.hoursOfGuidance != null && hoursN > 0
      ? {
          text: month
            ? `+${formatHours(hoursN)} hrs this month`
            : `${formatHours(hoursN)} hrs in the last ${win} days`,
          icon: 'trending_up',
          tone: 'positive',
        }
      : undefined;
  const missedWin = s.missedWindowDays;
  const missed = s.missedSessions;
  const missedInfo = `Sessions your mentor joined and you didn’t, in the last ${missedWin} days.`;
  // No "of 3" and no pause wording: the pause rule is undecided (#444, founder 25 Oct).
  const missedTile: Kpi =
    missed != null && missed > 0
      ? {
          key: 'missed',
          label: `Missed · ${missedWin} days`,
          value: String(missed),
          info: missedInfo,
          valueTone: missed >= 2 ? 'danger' : 'warning',
          href: { label: 'View missed', href: MISSED_HREF },
        }
      : {
          key: 'missed',
          label: 'Missed sessions',
          value: str(missed),
          info: missedInfo,
          trend:
            missed === 0
              ? { text: `None in ${missedWin} days`, icon: 'check_circle', tone: 'positive' }
              : undefined,
        };
  return [
    {
      key: 'sessions',
      label: 'Sessions held',
      value: str(s.sessionsHeld),
      info: 'Sessions you and your mentor both joined',
      trend: sessionsTrend,
    },
    // "View mentors" (opens Mentors you've met) is added by the screen, which owns the modal.
    {
      key: 'mentors',
      label: 'Mentors met',
      value: str(s.mentorsMet),
      info: 'Mentors you’ve completed at least one session with',
    },
    {
      key: 'hours',
      label: 'Hours of guidance',
      value: s.hoursOfGuidance == null ? null : formatHours(s.hoursOfGuidance),
      unit: 'hrs',
      info: 'Total length of your completed sessions',
      trend: hoursTrend,
    },
    missedTile,
  ];
}
