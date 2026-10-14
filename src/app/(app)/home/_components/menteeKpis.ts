import type { KpiTrend } from '@/components/molecules/KpiCard/KpiCard';
import type { MenteeStats } from '@/lib/api/data/menteeHome';

export type Kpi = {
  key: string;
  label: string;
  value: string | null;
  unit?: string;
  trend?: KpiTrend;
};

/** "9", "9.5" — hours without a trailing .0. */
export function formatHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const str = (n: number | null) => (n == null ? null : String(n));

/**
 * The four progress tiles for a returning mentee, from /me/mentee-stats.
 *
 * The trend shows the recent window's own activity — "N in the last 30 days" —
 * not a current-vs-previous delta: a decline would read as a discouraging
 * negative on a progress dashboard, and the backend sends both windows raw so
 * the choice is ours (noted in design-divergence.md). The window length and the
 * missed window are read from the response, never hard-coded.
 */
export function returningKpis(s: MenteeStats): Kpi[] {
  const win = s.windowDays;
  // Gate each trend on its all-time value being known too: a null value renders
  // "No data yet", so a recent-activity trend beneath it would contradict the
  // same card (the backend may omit the all-time figure while still sending the
  // window). No value, no trend.
  const sessionsTrend: KpiTrend | undefined =
    s.sessionsHeld != null && s.current.sessions > 0
      ? { text: `${s.current.sessions} in the last ${win} days`, icon: 'trending_up', tone: 'positive' }
      : undefined;
  const hoursTrend: KpiTrend | undefined =
    s.hoursOfGuidance != null && s.current.hours > 0
      ? {
          text: `${formatHours(s.current.hours)} hrs in the last ${win} days`,
          icon: 'trending_up',
          tone: 'positive',
        }
      : undefined;
  const missedWin = s.missedWindowDays;
  const missedTrend: KpiTrend | undefined =
    s.missedSessions == null
      ? undefined
      : s.missedSessions === 0
        ? { text: `None in the last ${missedWin} days`, icon: 'check_circle', tone: 'positive' }
        : { text: `${s.missedSessions} in the last ${missedWin} days`, tone: 'negative' };
  return [
    { key: 'sessions', label: 'Sessions held', value: str(s.sessionsHeld), trend: sessionsTrend },
    // The design's "View mentors" link opens the mentors-met list, which ships
    // with Book again (PR 2); until then the tile is value-only (design-divergence.md).
    { key: 'mentors', label: 'Mentors met', value: str(s.mentorsMet) },
    {
      key: 'hours',
      label: 'Hours of guidance',
      value: s.hoursOfGuidance == null ? null : formatHours(s.hoursOfGuidance),
      unit: 'hrs',
      trend: hoursTrend,
    },
    // No "of N" unit: the cap policy is undecided (backend #444, design-divergence.md).
    { key: 'missed', label: 'Missed sessions', value: str(s.missedSessions), trend: missedTrend },
  ];
}

/** The new mentee's encouraging, all-zero tiles (Mentee Dashboard v2.dc.html new state). */
export const NEW_MENTEE_KPIS: Kpi[] = [
  {
    key: 'sessions',
    label: 'Sessions held',
    value: '0',
    trend: { text: 'Your first one counts here', tone: 'neutral' },
  },
  {
    key: 'mentors',
    label: 'Mentors met',
    value: '0',
    trend: { text: 'Pick one to start', tone: 'neutral' },
  },
  {
    key: 'hours',
    label: 'Hours of guidance',
    value: '0',
    unit: 'hrs',
    trend: { text: 'Adds up as you go', tone: 'neutral' },
  },
  { key: 'missed', label: 'Missed sessions', value: '0', trend: { text: 'None so far', tone: 'neutral' } },
];
