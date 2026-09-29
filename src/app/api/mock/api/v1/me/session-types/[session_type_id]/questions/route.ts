import { NextResponse } from 'next/server';
import { mockAddQuestion, mockQuestions } from '@/lib/api/mock/sessionTypes';

type Ctx = { params: Promise<{ session_type_id: string }> };

/** MOCK of GET /api/v1/me/session-types/{id}/questions. ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const questions = mockQuestions(session_type_id);
  if (!questions) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ data: questions, next_cursor: null });
}

/** MOCK of POST …/questions → {id}. */
export async function POST(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 150));
  const r = mockAddQuestion(session_type_id, body);
  return r ? NextResponse.json(r, { status: 201 }) : new NextResponse(null, { status: 404 });
}
