import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

// Platform history starts Sept 2024 (backend #449; months 1–60). We never
// fabricate a month before launch, so even a wide request (e.g. 60) returns
// only the real span.
const START = { year: 2024, month: 9 };

/**
 * PHASE A MOCK of GET /api/v1/me/mentor-stats/monthly (#449): the mentor's
 * monthly sessions by outcome, ending with the current UTC month, so the
 * PerformanceChart has something to draw. ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const now = new Date();
  const sinceStart = Math.max(
    1,
    (now.getUTCFullYear() - START.year) * 12 + (now.getUTCMonth() + 1 - START.month) + 1,
  );
  const asked = Number(new URL(req.url).searchParams.get('months') ?? 12);
  const count = Math.min(Math.max(asked, 1), Math.min(60, sinceStart));
  const series = Array.from({ length: count }, (_, k) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - k), 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    // Months since launch, so a given calendar month reads the same whatever
    // range the chart slices — a gentle, believable climb toward the present.
    const ai = sinceStart - count + k;
    return {
      month,
      since: `${month}-01T00:00:00Z`,
      until: `${month}-${String(lastDay).padStart(2, '0')}T23:59:59Z`,
      completed_sessions: Math.max(0, Math.round(1 + ai * 0.5 + (ai % 3))),
      missed_by_mentor: ai % 7 === 0 ? 1 : 0,
      cancelled_by_mentor: ai % 6 === 0 ? 1 : 0,
      cancelled_by_mentee: ai % 4 === 0 ? 1 : 0,
      cancelled_by_other: 0,
    };
  });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/me/mentor-stats/monthly', 'get', { months: count, series });
}
