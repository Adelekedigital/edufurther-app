import { NextResponse } from 'next/server';
import { mockRelationship } from '@/lib/api/mock/reviews';
import { mineFor } from '@/lib/api/mock/reviewStore';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/me/mentors/{mentor_id}/relationship. ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: { params: Promise<{ mentor_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { mentor_id } = await ctx.params;
  const mine = mineFor(mentor_id);
  // Once the viewer has reviewed through the mock, nothing is due any more.
  return ok(
    '/api/v1/me/mentors/{mentor_id}/relationship',
    'get',
    mine
      ? {
          ...mockRelationship(mentor_id),
          review_due: false,
          // Implies review_due, so it cannot survive forcing that false.
          review_update_due: false,
          last_reviewed_at: mine.created_at,
        }
      : mockRelationship(mentor_id),
  );
}
