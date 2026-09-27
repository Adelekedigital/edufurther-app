import { NextResponse } from 'next/server';
import { MOCK_SESSION_TYPES, mockMentorExists } from '@/lib/api/mock/availability';

/** MOCK of GET /api/v1/users/{user_id}/session-types. ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  if (!mockMentorExists(userId)) return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return NextResponse.json({ data: MOCK_SESSION_TYPES, next_cursor: null });
}
