import { NextResponse } from 'next/server';

/**
 * MOCK of POST /api/v1/sessions/{id}/join: records attendance and hands back a
 * link minted for the caller. `u-2` answers with no venue, so the "marked as
 * here, but no meeting link" path can be seen. ENABLE_MOCK_API=1 only.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 200));
  return NextResponse.json({
    joined: true,
    meeting_url: sessionId === 'u-2' ? null : `https://example.invalid/room/${sessionId}`,
  });
}
