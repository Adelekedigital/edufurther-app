import { NextResponse } from 'next/server';
import { okStatus, problem } from '@/lib/api/mock/respond';
import { mockMissedReasons } from '@/lib/api/mock/missedReasons';

/**
 * MOCK of POST /api/v1/sessions/{id}/missed-reason: stores why the viewer
 * missed it, once (backend #532). A second send is the backend's 409.
 * ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 300));
  if (mockMissedReasons.has(sessionId))
    return problem(409, {
      type: '/problems/missed-reason-already-sent',
      title: 'A reason was already sent for this session.',
    });
  const body = (await req.json()) as { reason: string; note?: string | null };
  mockMissedReasons.add(sessionId);
  return okStatus('/api/v1/sessions/{session_id}/missed-reason', 'post', 201, {
    reason: body.reason as never,
    note: body.note?.trim() || null,
    created_at: new Date().toISOString(),
  });
}
