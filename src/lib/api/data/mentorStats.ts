'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AppError, Remote } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/** One month's sessions by outcome — raw counts, no presentation. */
export type MonthlyStats = {
  /** 'YYYY-MM', oldest first. */
  months: string[];
  completed: number[];
  /** All cancellations in the month (by mentor, mentee or system). */
  canceled: number[];
  /** The mentor's own no-shows (from attendance, not status). */
  missed: number[];
};

/**
 * GET /me/mentor-stats/monthly. The monthly session series behind the
 * performance chart. Bearer-only (the owner's own stats). Cancellations count
 * in the month they were made and "missed" is attendance-derived, both decided
 * server-side (backend #449) — we never bucket raw sessions for this.
 */
export function useMentorMonthlyStats(
  userId: string | null,
  months = 12,
): { data: MonthlyStats; isLoading: boolean; error: AppError | null; retry: () => void } {
  const query = useQuery({
    queryKey: keys.mentorStats.monthly(userId ?? 'none', months),
    enabled: userId !== null,
    queryFn: async ({ signal }): Promise<MonthlyStats> => {
      const { data, error, response } = await api.GET('/api/v1/me/mentor-stats/monthly', {
        params: { query: { months } },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error);
      const rows = data.series ?? [];
      return {
        months: rows.map((r) => r.month),
        completed: rows.map((r) => r.completed_sessions ?? 0),
        canceled: rows.map(
          (r) =>
            (r.cancelled_by_mentor ?? 0) +
            (r.cancelled_by_mentee ?? 0) +
            (r.cancelled_by_other ?? 0),
        ),
        missed: rows.map((r) => r.missed_by_mentor ?? 0),
      };
    },
  });
  return {
    data: query.data ?? { months: [], completed: [], canceled: [], missed: [] },
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** One window's figures. `null` fields mean "no data", never zero. */
export type StatBlock = {
  since: string;
  until: string;
  completedSessions: number;
  mentoringMinutes: number;
  menteesMentored: number;
  attendanceRate: number | null;
  missedByMentor: number;
  /**
   * Sessions the mentor missed where the mentee attended — the honest "left
   * waiting" count (backend #466). Always ≤ missedByMentor; excludes both-missed
   * and unknown-mentee sessions.
   */
  menteesLeftWaiting: number;
  /** The mentee's own no-shows — the mentor still attended, so not their fault. */
  missedByMentee: number;
  cancelledByMentor: number;
  reviewCount: number;
  averageRating: number | null;
};

export type WindowStats = {
  windowDays: number;
  /**
   * The calendar year the figures are for when fetched by year (contract #469),
   * else null for a trailing window. Set client-side from the request so the card
   * can label a year "in YYYY" — `window_days` alone can't tell a calendar year
   * (365/366) from a trailing 12 months.
   */
  year: number | null;
  /**
   * Held sessions in a row since the mentor's own last miss or cancellation.
   * Top-level, not windowed; 0 means none since (or not a mentor).
   */
  currentStreak: number;
  current: StatBlock;
  previous: StatBlock;
};

/**
 * How the session-quality card queries mentor-stats: a trailing window, or a
 * whole calendar year. They map to `window_days` / `year` — never both (422).
 */
export type StatsQuery = { windowDays: number } | { year: number };

const block = (b: {
  since: string;
  until: string;
  completed_sessions: number;
  mentoring_minutes: number;
  mentees_mentored: number;
  attendance_rate?: number | null;
  missed_by_mentor: number;
  mentees_left_waiting: number;
  missed_by_mentee: number;
  cancelled_by_mentor: number;
  review_count: number;
  average_rating?: number | null;
}): StatBlock => ({
  since: b.since,
  until: b.until,
  completedSessions: b.completed_sessions,
  mentoringMinutes: b.mentoring_minutes,
  menteesMentored: b.mentees_mentored,
  attendanceRate: b.attendance_rate ?? null,
  missedByMentor: b.missed_by_mentor,
  menteesLeftWaiting: b.mentees_left_waiting,
  missedByMentee: b.missed_by_mentee,
  cancelledByMentor: b.cancelled_by_mentor,
  reviewCount: b.review_count,
  averageRating: b.average_rating ?? null,
});

/**
 * GET /me/mentor-stats by a trailing `window_days` (7–365) or a whole calendar
 * `year` (contract #469) — the current window/year and the equal one before it,
 * so the caller computes its own trend (the KPI ↑/↓ delta) or reads the current
 * figures (the session-quality panel).
 */
export function useMentorStats(userId: string | null, q: StatsQuery): Remote<WindowStats> {
  const byYear = 'year' in q;
  const query = useQuery({
    queryKey: byYear
      ? keys.mentorStats.year(userId ?? 'none', q.year)
      : keys.mentorStats.window(userId ?? 'none', q.windowDays),
    enabled: userId !== null,
    // The window changes when the mentor switches the chart range; keep the last
    // window's figures on screen while the new one loads, so the card updates in
    // place instead of flashing back to its skeleton on every toggle.
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }): Promise<WindowStats> => {
      const { data, error, response } = await api.GET('/api/v1/me/mentor-stats', {
        // One of window_days / year — sending both is a 422 (contract #469).
        params: { query: byYear ? { year: q.year } : { window_days: q.windowDays } },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error);
      return {
        windowDays: data.window_days,
        year: byYear ? q.year : null,
        currentStreak: data.current_streak ?? 0,
        current: block(data.current),
        previous: block(data.previous),
      };
    },
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && userId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
