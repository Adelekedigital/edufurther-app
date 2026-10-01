import { NextResponse } from 'next/server';
import { addDays } from '@/lib/utils/slots';

/**
 * MOCK of GET /api/v1/users/{id}/availability/exceptions: one whole-day block
 * of three days, ten days from today. ENABLE_MOCK_API=1 only.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  const start = addDays(new Date().toISOString().slice(0, 10), 10);
  return NextResponse.json([
    {
      id: 'ex-1',
      type: 'block',
      start_date: start,
      end_date: addDays(start, 3),
      start_time: null,
      end_time: null,
      timezone: 'Africa/Lagos',
      reason: null,
    },
  ]);
}
