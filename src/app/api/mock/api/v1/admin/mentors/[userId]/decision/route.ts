import { NextResponse } from 'next/server';
import { decideMock } from '@/lib/api/mock/adminMentors';
import { ok, problem } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ userId: string }> };

/** MOCK of POST /api/v1/admin/mentors/{user_id}/decision?approve= on the in-memory store. */
export async function POST(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const approve = new URL(req.url).searchParams.get('approve') !== 'false';
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: unknown };
  await new Promise((r) => setTimeout(r, 400));
  if (!decideMock(userId, approve, typeof reason === 'string' ? reason : null)) return problem(404);
  return ok('/api/v1/admin/mentors/{user_id}/decision', 'post', { decided: true });
}
