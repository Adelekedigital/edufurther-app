import { NextResponse } from 'next/server';

/**
 * MOCK of POST /api/v1/sessions/{id}/door: a way back into a running session
 * for someone who has joined. Records nothing. `u-2` answers with no way in,
 * so the "no way into this call right now" line can be seen.
 * ENABLE_MOCK_API=1 only.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 200));
  return NextResponse.json({
    meeting_url: sessionId === 'u-2' ? null : `https://example.invalid/room/${sessionId}`,
  });
}
