import { NextResponse } from 'next/server';

/**
 * MOCK of GET /api/v1/sessions/{id}: the same row the list returns, which is
 * what the real endpoint does. Only a `?booking=` link opened cold asks for it.
 * ENABLE_MOCK_API=1 only.
 */
/** The mock viewer this page is being read as (viewer.ts MOCK_VIEWERS). */
export function mockViewerId(req: Request): string {
  const referer = req.headers.get('referer');
  const asked = referer ? new URL(referer).searchParams.get('mockViewer') : null;
  const which = asked ?? process.env.NEXT_PUBLIC_MOCK_VIEWER ?? 'mentee';
  return which === 'mentor' ? 'mock-mentor' : 'mock-viewer';
}

export async function GET(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  // Reuse the list mock so the two can never disagree about a session. The
  // viewer decides which side of each row is "theirs", and it can be switched
  // per-page with ?mockViewer=, which only the Referer carries here.
  const url = new URL(req.url);
  const list = await fetch(
    `${url.origin}/api/mock/api/v1/users/${mockViewerId(req)}/sessions?limit=50`,
    { headers: { cookie: req.headers.get('cookie') ?? '' } },
  ).then((r) => r.json() as Promise<{ data: { id: string }[] }>);
  const row = list.data.find((s) => s.id === sessionId);
  return row ? NextResponse.json(row) : new NextResponse(null, { status: 404 });
}
