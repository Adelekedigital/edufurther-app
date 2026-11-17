import { NextResponse } from 'next/server';
import { decideMock } from '@/lib/api/mock/adminMentors';
import { ok, problem } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ userId: string }> };

/** MOCK of POST /api/v1/admin/mentors/{user_id}/decision?approve= on the in-memory store. */
export async function POST(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const approve = new URL(req.url).searchParams.get('approve') !== 'false';
  // `message` (backend 350), with `reason` its older name.
  const { message, reason } = (await req.json().catch(() => ({}))) as {
    message?: unknown;
    reason?: unknown;
  };
  const note = typeof message === 'string' ? message : typeof reason === 'string' ? reason : null;
  if (note !== null && note.trim().length > 1000)
    return problem(422, { title: 'Validation failed' });
  await new Promise((r) => setTimeout(r, 400));
  if (!decideMock(userId, approve, note?.trim() || null)) return problem(404);
  return ok('/api/v1/admin/mentors/{user_id}/decision', 'post', { decided: true });
}
