import { NextResponse, type NextRequest } from 'next/server';
import { MOCK_SESSION_TYPES, mockMentorExists, mockSlots } from '@/lib/api/mock/availability';
import { MAX_WINDOW_DAYS } from '@/lib/api/mock/bookingPrefs';

const DAY = 24 * 60 * 60 * 1000;

/**
 * MOCK of GET /api/v1/users/{user_id}/availability/slots: `session_type_id`
 * required, `start`/`end` dates (`end` exclusive, default 7 days); like the
 * backend, a range longer than the platform's maximum window plus five days is a 422.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const typeId = sp.get('session_type_id');
  if (!mockMentorExists(userId) || !MOCK_SESSION_TYPES.some((t) => t.id === typeId))
    return new NextResponse(null, { status: 404 });
  const now = Date.now();
  const startParam = sp.get('start');
  const endParam = sp.get('end');
  const start = startParam ? Date.parse(`${startParam}T00:00:00Z`) : now;
  const end = endParam ? Date.parse(`${endParam}T00:00:00Z`) : now + 7 * DAY;
  // The contract's rule: end after start, and at most the maximum window + 5 days.
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start || end - start > (MAX_WINDOW_DAYS + 5) * DAY)
    return NextResponse.json(
      { type: 'about:blank', title: 'Unprocessable Content', status: 422 },
      { status: 422, headers: { 'content-type': 'application/problem+json' } },
    );
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({ data: mockSlots(userId, typeId!, end, now), next_cursor: null });
}
