import { NextResponse } from 'next/server';
import { mockRestoreSessionType } from '@/lib/api/mock/sessionTypes';

type Ctx = { params: Promise<{ session_type_id: string }> };

/** MOCK of POST /api/v1/me/session-types/{id}/restore → 200 the type, still hidden (round 4). */
export async function POST(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  await new Promise((r) => setTimeout(r, 300));
  const t = mockRestoreSessionType(session_type_id);
  if (!t)
    return NextResponse.json(
      { type: 'about:blank', title: 'Not found', status: 404 },
      { status: 404, headers: { 'content-type': 'application/problem+json' } },
    );
  return NextResponse.json(t);
}
