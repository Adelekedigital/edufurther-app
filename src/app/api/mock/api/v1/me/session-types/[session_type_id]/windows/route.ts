import { NextResponse } from 'next/server';
import { mockAddWindow } from '@/lib/api/mock/sessionTypes';

/** MOCK of POST /api/v1/me/session-types/{id}/windows (backend #15). ENABLE_MOCK_API=1 only. */
export async function POST(req: Request, ctx: { params: Promise<{ session_type_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const body = await req.json().catch(() => null);
  await new Promise((r) => setTimeout(r, 200));
  const w = mockAddWindow(session_type_id, body);
  return w ? NextResponse.json(w, { status: 201 }) : new NextResponse(null, { status: 404 });
}
