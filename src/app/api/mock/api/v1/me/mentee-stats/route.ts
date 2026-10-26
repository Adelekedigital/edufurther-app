import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/me/mentee-stats (backend decision 249) — the mentee home
 * "Your progress" figures. Sample values match the design (12 sessions, 8
 * mentors, 9 hrs, 0 missed), with a recent 30-day window beside the one before.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 120));
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
  return ok('/api/v1/me/mentee-stats', 'get', {
    sessions_held: 12,
    sessions_attended: 13,
    mentors_met: 8,
    minutes_of_guidance: 540,
    missed_sessions: 0,
    missed_window_days: 90,
    window_days: 30,
    current: { since: iso(30), until: iso(0), completed_sessions: 2, minutes: 90 },
    previous: { since: iso(60), until: iso(30), completed_sessions: 1, minutes: 45 },
  });
}
