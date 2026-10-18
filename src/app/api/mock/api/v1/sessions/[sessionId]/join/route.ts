import { NextResponse } from 'next/server';
import { ok, problem } from '@/lib/api/mock/respond';
import { mockEntryRefusal } from '@/lib/api/mock/entryRefusals';

/**
 * MOCK of POST /api/v1/sessions/{id}/join: records attendance and hands back a
 * link minted for the caller. Called by the entry route, /sessions/{id}/enter
 * (ADR 0009), not by the page. `u-2` answers with no venue (`?enter=nolink`);
 * j-8 and j-9 answer 409 (lib/api/mock/entryRefusals), so the route goes on to
 * the door. ENABLE_MOCK_API=1 only.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 200));
  const refused = mockEntryRefusal(sessionId);
  if (refused) return problem(409, refused);
  return ok('/api/v1/sessions/{session_id}/join', 'post', {
    joined: true,
    meeting_url: sessionId === 'u-2' ? null : `https://example.invalid/room/${sessionId}`,
  });
}
