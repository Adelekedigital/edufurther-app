'use client';

import { useQuery } from '@tanstack/react-query';
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
  /** The mentee's own no-shows — the mentor still attended, so not their fault. */
  missedByMentee: number;
  cancelledByMentor: number;
  reviewCount: number;
  averageRating: number | null;
};

export type WindowStats = {
  windowDays: number;
  /**
   * Held sessions in a row since the mentor's own last miss or cancellation.
   * Top-level, not windowed; 0 means none since (or not a mentor).
   */
  currentStreak: number;
  current: StatBlock;
  previous: StatBlock;
};

const block = (b: {
  since: string;
  until: string;
  completed_sessions: number;
  mentoring_minutes: number;
  mentees_mentored: number;
  attendance_rate?: number | null;
  missed_by_mentor: number;
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
  missedByMentee: b.missed_by_mentee,
  cancelledByMentor: b.cancelled_by_mentor,
  reviewCount: b.review_count,
  averageRating: b.average_rating ?? null,
});

/**
 * GET /me/mentor-stats?window_days=N. The current window and the equal one
 * before it, so the caller computes its own trend (the KPI ↑/↓ delta) or reads
 * the current figures (the session-quality panel). `window_days` is 7–365.
 */
export function useMentorStats(userId: string | null, windowDays: number): Remote<WindowStats> {
  const query = useQuery({
    queryKey: keys.mentorStats.window(userId ?? 'none', windowDays),
    enabled: userId !== null,
    queryFn: async ({ signal }): Promise<WindowStats> => {
      const { data, error, response } = await api.GET('/api/v1/me/mentor-stats', {
        params: { query: { window_days: windowDays } },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error);
      return {
        windowDays: data.window_days,
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
