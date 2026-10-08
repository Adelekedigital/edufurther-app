import { NextResponse } from 'next/server';
import { mockReviewable, mockReviewableIds } from '@/lib/api/mock/reviewStore';

/** MOCK of GET /api/v1/me/reviewable-sessions?mentor_id=. ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const mentorId = new URL(req.url).searchParams.get('mentor_id');
  // Unfiltered (the join page and Bookings): the join page's completed mock
  // session `j-5` is reviewable until a review for it is sent.
  if (!mentorId)
    return NextResponse.json({
      data: mockReviewable('').concat(
        mockReviewableIds(['j-5']).map((id) => ({
          session_id: id,
          mentor_id: 'mock-j-5',
          starts_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
          session_type_id: 'st-general',
          session_type_name: '1:1 call',
        })),
      ),
      next_cursor: null,
    });
  return NextResponse.json({ data: mockReviewable(mentorId), next_cursor: null });
}
