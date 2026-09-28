import { NextResponse } from 'next/server';
import { mockQuestions } from '@/lib/api/mock/sessionTypes';

/** MOCK of GET /api/v1/me/session-types/{id}/questions. ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: { params: Promise<{ session_type_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const questions = mockQuestions(session_type_id);
  if (!questions) return new NextResponse(null, { status: 404 });
  return NextResponse.json({ data: questions, next_cursor: null });
}
