import { NextResponse } from 'next/server';
import { ok, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of POST /api/v1/sessions/{id}/decline. ENABLE_MOCK_API=1 only.
 * `b-conflict` always answers 409, so the "it moved under you" path is
 * reachable in dev without racing a second window.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 400));
  if (sessionId === 'b-conflict')
    return problem(409, { type: '/problems/conflict', title: 'Already settled' });
  return ok('/api/v1/sessions/{session_id}/decline', 'post', { declined: true });
}
