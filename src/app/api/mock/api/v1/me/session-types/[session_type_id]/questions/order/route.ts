import { NextResponse } from 'next/server';
import { mockOrderQuestions } from '@/lib/api/mock/sessionTypes';

/** MOCK of PUT …/questions/order: every live question once → 204, else 422. */
export async function PUT(req: Request, ctx: { params: Promise<{ session_type_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { question_ids?: unknown };
  await new Promise((r) => setTimeout(r, 150));
  return new NextResponse(null, { status: mockOrderQuestions(session_type_id, body.question_ids) });
}
