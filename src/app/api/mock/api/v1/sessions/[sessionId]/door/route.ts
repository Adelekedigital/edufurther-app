import { NextResponse } from 'next/server';
import { ok, problem } from '@/lib/api/mock/respond';
import { mockEntryRefusal } from '@/lib/api/mock/entryRefusals';

/**
 * MOCK of POST /api/v1/sessions/{id}/door: a way back into a running session
 * for someone who has joined. Records nothing. Called by the entry route,
 * /sessions/{id}/enter (ADR 0009), after /join answers 409. `u-2` answers
 * with no way in; j-8 refuses a late first arrival (`?enter=closed`) and j-9
 * with a plain 409 (`?enter=notopen`). ENABLE_MOCK_API=1 only.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 200));
  const refused = mockEntryRefusal(sessionId);
  if (refused) return problem(409, refused);
  return ok('/api/v1/sessions/{session_id}/door', 'post', {
    meeting_url: sessionId === 'u-2' ? null : `https://example.invalid/room/${sessionId}`,
  });
}
