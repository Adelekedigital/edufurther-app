import { NextResponse } from 'next/server';
import { mockReviewable } from '@/lib/api/mock/reviewStore';

/** MOCK of GET /api/v1/me/reviewable-sessions?mentor_id=. ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const mentorId = new URL(req.url).searchParams.get('mentor_id') ?? '';
  return NextResponse.json({ data: mockReviewable(mentorId), next_cursor: null });
}
