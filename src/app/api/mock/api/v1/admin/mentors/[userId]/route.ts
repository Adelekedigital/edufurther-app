import { NextResponse } from 'next/server';
import { mockMentorDetail } from '@/lib/api/mock/adminMentors';
import { ok, problem } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ userId: string }> };

/** MOCK of GET /api/v1/admin/mentors/{user_id} (Admin PRD A4). ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 250));
  const detail = mockMentorDetail(userId);
  return detail ? ok('/api/v1/admin/mentors/{user_id}', 'get', detail) : problem(404);
}
