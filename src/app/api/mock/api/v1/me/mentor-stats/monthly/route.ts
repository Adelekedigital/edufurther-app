import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * PHASE A MOCK of GET /api/v1/me/mentor-stats/monthly (#449): the mentor's monthly
 * sessions by outcome, as the backend does it — exactly the last `months` UTC
 * calendar months ending with the current one, with a zero row for any empty
 * month (so a late-joiner's earlier months come back as zeros). ENABLE_MOCK_API=1.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const now = new Date();
  const count = Math.min(Math.max(Number(new URL(req.url).searchParams.get('months') ?? 12), 1), 60);
  // Model a mentor whose first session was ~18 months ago: earlier months (and the
  // earlier calendar years the wide window spans) are the backend's zero rows, so
  // the chart's year picker offers only the years the mentor has actually been active.
  const firstSession = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 17, 1));
  const series = Array.from({ length: count }, (_, k) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - k), 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    // Months since the mentor's first session; before it, a zero row.
    const ai =
      (d.getUTCFullYear() - firstSession.getUTCFullYear()) * 12 +
      (d.getUTCMonth() - firstSession.getUTCMonth());
    const active = ai >= 0;
    return {
      month,
      since: `${month}-01T00:00:00Z`,
      until: `${month}-${String(lastDay).padStart(2, '0')}T23:59:59Z`,
      completed_sessions: active ? Math.max(0, Math.round(1 + ai * 0.3 + (ai % 3))) : 0,
      missed_by_mentor: active && ai % 7 === 0 ? 1 : 0,
      cancelled_by_mentor: active && ai % 6 === 0 ? 1 : 0,
      cancelled_by_mentee: active && ai % 4 === 0 ? 1 : 0,
      cancelled_by_other: 0,
    };
  });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/me/mentor-stats/monthly', 'get', { months: count, series });
}
