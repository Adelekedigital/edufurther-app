import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * PHASE A MOCK of GET /api/v1/me/mentor-stats?window_days=N (#446) or ?year=YYYY
 * (#469): the current window/year and the equal one before it, so the KPI trend row
 * and the session-quality panel have figures to compare. `attendance_rate` is
 * 0–100. Shaped so 30d gives "+1 session this month" and 90d "+0.2 rating this
 * quarter". ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const params = new URL(req.url).searchParams;
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

  // Calendar-year query (contract #469): one whole year, compared year-against-year,
  // with window_days = that year's length. Only the current UTC year + 4 prior are
  // allowed (the whole years the 60-month chart shows); anything else is a 422.
  const yearRaw = params.get('year');
  if (yearRaw != null) {
    const year = Number(yearRaw);
    const nowYear = new Date().getUTCFullYear();
    if (!Number.isInteger(year) || year > nowYear || year < nowYear - 4) {
      return new NextResponse(null, { status: 422 });
    }
    const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const bound = (y: number) => new Date(Date.UTC(y, 0, 1)).toISOString();
    // A per-year shape so switching years visibly changes the card: older years
    // accrue more misses, so the show-up rate slides from on-track to at-risk.
    const forYear = (y: number) => {
      const age = nowYear - y;
      const completed = Math.max(2, 40 - age * 6);
      const missed = 1 + age;
      return {
        since: bound(y),
        until: bound(y + 1),
        completed_sessions: completed,
        mentoring_minutes: completed * 60,
        mentees_mentored: Math.max(1, completed - 4),
        attendance_rate: Math.round((completed / (completed + missed)) * 100),
        missed_by_mentor: missed,
        mentees_left_waiting: Math.max(0, missed - 1),
        missed_by_mentee: age,
        cancelled_by_mentor: 1 + age,
        review_count: Math.max(3, 16 - age * 3),
        average_rating: Number((4.8 - age * 0.1).toFixed(2)),
      };
    };
    await new Promise((r) => setTimeout(r, 200));
    return ok('/api/v1/me/mentor-stats', 'get', {
      window_days: leap(year) ? 366 : 365,
      current_streak: 5,
      current: forYear(year),
      previous: forYear(year - 1),
    });
  }

  const raw = Number(params.get('window_days') ?? 90);
  const w = Number.isFinite(raw) ? Math.min(Math.max(raw, 7), 365) : 90;
  const wide = w >= 90;

  const current = {
    since: iso(w),
    until: iso(0),
    completed_sessions: wide ? 12 : 4,
    mentoring_minutes: wide ? 720 : 240,
    mentees_mentored: wide ? 6 : 3,
    // A plausible show-up rate, kept at completed / (completed + missed) for this
    // demo so the dev ring and counts don't look contradictory. (Real data can
    // sit higher — a mentee no-show still counts the mentor as attending.)
    attendance_rate: wide ? 86 : 80,
    missed_by_mentor: wide ? 2 : 1,
    // Mentees a mentor no-show left waiting — the at-risk headline. Kept below
    // missed_by_mentor here so the dev card shows the honest distinction (a double
    // no-show left no mentee waiting). Always ≤ missed_by_mentor (#466).
    mentees_left_waiting: wide ? 1 : 0,
    // Mentee no-shows (the mentor still attended). Part of the contract; the
    // session-quality card no longer surfaces this to the mentor.
    missed_by_mentee: wide ? 1 : 0,
    cancelled_by_mentor: wide ? 2 : 1,
    review_count: 14,
    average_rating: 4.8,
  };
  const previous = {
    since: iso(2 * w),
    until: iso(w),
    completed_sessions: wide ? 10 : 3,
    mentoring_minutes: wide ? 600 : 180,
    mentees_mentored: wide ? 5 : 3,
    attendance_rate: wide ? 77 : 75,
    missed_by_mentor: wide ? 3 : 1,
    mentees_left_waiting: wide ? 2 : 1,
    missed_by_mentee: wide ? 2 : 1,
    cancelled_by_mentor: wide ? 3 : 2,
    review_count: wide ? 11 : 13,
    average_rating: wide ? 4.6 : 4.75,
  };

  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/me/mentor-stats', 'get', {
    window_days: w,
    // Held sessions in a row since the mentor's own last miss (#460), not windowed.
    current_streak: 5,
    current,
    previous,
  });
}
