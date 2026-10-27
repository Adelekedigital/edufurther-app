import { NextResponse } from 'next/server';
import { listingMock } from '@/lib/api/mock/adminMentors';
import { ok, problem } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ userId: string }> };

/**
 * MOCK of POST /api/v1/admin/mentors/{user_id}/listing?listed=: unlisting needs
 * a reason (422 without, A8); resuming a mentor who paused themselves is 409.
 */
export async function POST(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const listed = new URL(req.url).searchParams.get('listed') === 'true';
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (!listed && !why) return problem(422, { title: 'Validation failed' });
  await new Promise((r) => setTimeout(r, 400));
  const out = listingMock(userId, listed, why || null);
  if (out === 'self') return problem(409, { type: '/problems/mentor-paused-themselves' });
  if (out === 'missing') return problem(404);
  return ok('/api/v1/admin/mentors/{user_id}/listing', 'post', { changed: true });
}
