import { NextResponse } from 'next/server';
import { mockAddWindow, mockWindows } from '@/lib/api/mock/sessionTypes';

type Ctx = { params: Promise<{ session_type_id: string }> };

/** MOCK of GET /api/v1/me/session-types/{id}/windows (backend #15). ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const list = mockWindows(session_type_id);
  return list
    ? NextResponse.json({ data: list, next_cursor: null })
    : new NextResponse(null, { status: 404 });
}

/** MOCK of POST …/windows. */
export async function POST(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const body = await req.json().catch(() => null);
  await new Promise((r) => setTimeout(r, 200));
  const w = mockAddWindow(session_type_id, body);
  return w ? NextResponse.json(w, { status: 201 }) : new NextResponse(null, { status: 404 });
}
