import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * PHASE A MOCK of GET /api/v1/me/mentor-stats?window_days=N (#446): the current
 * window and the equal one before it, so the KPI trend row and the
 * session-quality panel have figures to compare. `attendance_rate` is 0–100.
 * Shaped so 30d gives "+1 session this month" and 90d "+0.2 rating this
 * quarter". ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const raw = Number(new URL(req.url).searchParams.get('window_days') ?? 90);
  const w = Number.isFinite(raw) ? Math.min(Math.max(raw, 7), 365) : 90;
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
  const wide = w >= 90;

  const current = {
    since: iso(w),
    until: iso(0),
    completed_sessions: wide ? 12 : 4,
    mentoring_minutes: wide ? 720 : 240,
    mentees_mentored: wide ? 6 : 3,
    attendance_rate: 94,
    missed_by_mentor: wide ? 2 : 1,
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
    attendance_rate: 90,
    missed_by_mentor: wide ? 3 : 1,
    cancelled_by_mentor: wide ? 3 : 2,
    review_count: wide ? 11 : 13,
    average_rating: wide ? 4.6 : 4.75,
  };

  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/me/mentor-stats', 'get', { window_days: w, current, previous });
}
