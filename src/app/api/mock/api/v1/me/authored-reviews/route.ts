import { NextResponse } from 'next/server';
import { authoredRow, store } from '@/lib/api/mock/reviewStore';

/**
 * MOCK of GET /api/v1/me/authored-reviews?mentor_id= (backend #285): reviews
 * the viewer wrote, newest first, withdrawn left out. ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const mentorId = new URL(req.url).searchParams.get('mentor_id');
  const data = [...store.reviews.values()]
    .filter((r) => !mentorId || r.reviewed_for === mentorId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map(authoredRow);
  return NextResponse.json({ data, next_cursor: null });
}
