import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

// A rising-ish pattern, so the chart shows a believable climb.
const COMPLETED = [0, 1, 0, 2, 1, 2, 3, 2, 4, 3, 2, 5, 4, 6, 3, 5, 7, 4, 6, 8, 5, 7, 9, 6];

/**
 * PHASE A MOCK of GET /api/v1/me/mentor-stats/monthly (#449): the mentor's
 * monthly sessions by outcome, ending with the current UTC month, so the
 * PerformanceChart has something to draw. ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const months = Number(new URL(req.url).searchParams.get('months') ?? 12);
  const count = Math.min(Math.max(months, 1), 24);
  const now = new Date();
  const series = Array.from({ length: count }, (_, k) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - k), 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const i = 24 - count + k;
    return {
      month,
      since: `${month}-01T00:00:00Z`,
      until: `${month}-${String(lastDay).padStart(2, '0')}T23:59:59Z`,
      completed_sessions: COMPLETED[i] ?? 0,
      missed_by_mentor: i % 7 === 0 ? 1 : 0,
      cancelled_by_mentor: i % 6 === 0 ? 1 : 0,
      cancelled_by_mentee: i % 4 === 0 ? 1 : 0,
      cancelled_by_other: 0,
    };
  });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/me/mentor-stats/monthly', 'get', { months: count, series });
}
