import { NextResponse } from 'next/server';
import { mockRelationship } from '@/lib/api/mock/reviews';

/** MOCK of GET /api/v1/me/mentors/{mentor_id}/relationship. ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: { params: Promise<{ mentor_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { mentor_id } = await ctx.params;
  return NextResponse.json(mockRelationship(mentor_id));
}
