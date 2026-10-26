'use client';

import { useQuery } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { Remote } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

/**
 * The mentee home progress stats (GET /api/v1/me/mentee-stats, backend decision
 * 249) — what the "Your progress" strip shows: sessions held, mentors met and
 * hours of guidance all time, missed sessions in the last `missedWindowDays`,
 * plus a recent window (`current`, the last `windowDays` days) beside the equal
 * one before (`previous`), as raw numbers the view turns into a trend.
 *
 * 200 for any signed-in caller (a new or mentor-only user gets zeros); minutes,
 * not hours, so we divide. Every figure may be absent, so each reads as null
 * rather than 0; `current`/`previous` are always sent.
 */

/** A trend window's own session and hour counts. */
export type StatsWindow = { sessions: number; hours: number };

export type MenteeStats = {
  /** Completed sessions as a mentee, all time. */
  sessionsHeld: number | null;
  mentorsMet: number | null;
  /** Hours (minutes ÷ 60), all time. */
  hoursOfGuidance: number | null;
  /** Mentee no-shows in the trailing `missedWindowDays` days. */
  missedSessions: number | null;
  /** The window the missed count covers (e.g. 90) — read, not hard-coded. */
  missedWindowDays: number;
  /** The trend window length (e.g. 30). */
  windowDays: number;
  /** The last `windowDays` days, and the equal window before, for the trend. */
  current: StatsWindow;
  previous: StatsWindow;
  /** The calendar month so far, for "+N this month"; null until the backend sends it. */
  thisMonth: StatsWindow | null;
  /** Sessions the mentee attended (pressed Join; a mentor no-show counts), for the invite unlock; null until sent. */
  sessionsAttended: number | null;
};

type StatsRead = components['schemas']['MenteeStatsRead'];

/** A figure the backend omits reads as absent, not 0. */
const n = (v: number | null | undefined) => (typeof v === 'number' ? v : null);
const toHours = (minutes: number | null | undefined) =>
  typeof minutes === 'number' ? minutes / 60 : 0;

function toStats(dto: StatsRead): MenteeStats {
  // The UTC calendar month so far (backend #549), for "+N this month".
  const month = dto.this_month;
  return {
    sessionsHeld: n(dto.sessions_held),
    mentorsMet: n(dto.mentors_met),
    hoursOfGuidance: dto.minutes_of_guidance != null ? dto.minutes_of_guidance / 60 : null,
    missedSessions: n(dto.missed_sessions),
    missedWindowDays: dto.missed_window_days ?? 90,
    windowDays: dto.window_days ?? 30,
    current: { sessions: dto.current.completed_sessions, hours: toHours(dto.current.minutes) },
    previous: { sessions: dto.previous.completed_sessions, hours: toHours(dto.previous.minutes) },
    thisMonth: month ? { sessions: month.completed_sessions, hours: toHours(month.minutes) } : null,
    // The invite unlock's count (backend #548): a mentor no-show still counts.
    sessionsAttended: n(dto.sessions_attended),
  };
}

/** Stands in for the stats while a (rare) null slips through to the view. */
export const EMPTY_STATS: MenteeStats = {
  sessionsHeld: null,
  mentorsMet: null,
  hoursOfGuidance: null,
  missedSessions: null,
  missedWindowDays: 90,
  windowDays: 30,
  current: { sessions: 0, hours: 0 },
  previous: { sessions: 0, hours: 0 },
  thisMonth: null,
  sessionsAttended: null,
};

/** The authenticated mentee's progress stats for the home KPI strip. */
export function useMenteeStats(userId: string | null, active = true): Remote<MenteeStats> {
  const session = useSession();
  const enabled = active && !!userId && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.menteeHome.stats(sessionKey(session)),
    enabled,
    staleTime: 60_000,
    // As useUpcomingBookings on this screen: offline, surface the error (and its
    // retry) rather than spin skeletons for ever waiting to come back online.
    networkMode: 'always',
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<MenteeStats> => {
      const { data, error, response } = await api.GET('/api/v1/me/mentee-stats', { signal });
      if (!data) throw apiError(response.status, error, response);
      return toStats(data);
    },
  });
  return {
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}
