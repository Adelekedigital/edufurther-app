import { NextResponse } from 'next/server';
import { mockEditQuestion, mockRemoveQuestion } from '@/lib/api/mock/sessionTypes';

type Ctx = { params: Promise<{ session_type_id: string; question_id: string }> };

/** MOCK of PATCH …/questions/{id} → {updated: true}. ENABLE_MOCK_API=1 only. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id, question_id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 150));
  return mockEditQuestion(session_type_id, question_id, body)
    ? NextResponse.json({ updated: true })
    : new NextResponse(null, { status: 404 });
}

/** MOCK of DELETE …/questions/{id} → 204. */
export async function DELETE(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id, question_id } = await ctx.params;
  await new Promise((r) => setTimeout(r, 150));
  return new NextResponse(null, {
    status: mockRemoveQuestion(session_type_id, question_id) ? 204 : 404,
  });
}
