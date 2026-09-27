import { NextResponse, type NextRequest } from 'next/server';
import { MOCK_SESSION_TYPES, mockMentorExists, mockSlots } from '@/lib/api/mock/availability';

const DAY = 24 * 60 * 60 * 1000;

/**
 * MOCK of GET /api/v1/users/{user_id}/availability/slots: `session_type_id`
 * required, `end` an exclusive date (default 7 days), at most 56 days.
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
  const endParam = sp.get('end');
  const end = endParam ? Date.parse(`${endParam}T00:00:00Z`) : now + 7 * DAY;
  if (Number.isNaN(end) || end - now > 56 * DAY)
    return NextResponse.json(
      { type: 'about:blank', title: 'Unprocessable Content', status: 422 },
      { status: 422, headers: { 'content-type': 'application/problem+json' } },
    );
  await new Promise((r) => setTimeout(r, 300));
  return NextResponse.json({ data: mockSlots(userId, typeId!, end, now), next_cursor: null });
}
