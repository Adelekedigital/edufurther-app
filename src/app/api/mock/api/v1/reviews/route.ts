import { NextResponse } from 'next/server';
import {
  MOCK_EDIT_WINDOW_MS,
  mockReviewable,
  mockReviewableIds,
  reviewRead,
  store,
} from '@/lib/api/mock/reviewStore';

const SCALE = ['poor', 'okay', 'great'];

/**
 * MOCK of POST /api/v1/reviews (the agreed review bundle). 409 with the
 * backend's problem type when the session already has a review; 422 when a
 * rating is off its scale or the public text is empty. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const b = (await req.json()) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 400));
  const sessionId = String(b.session_id ?? '');
  // The join page's mock session j-5 belongs to its mock mentor, mock-j-5.
  const joinPage = mockReviewableIds(['j-5']).includes(sessionId);
  const mentorId = joinPage ? 'mock-j-5' : sessionId.replace(/-s\d+$/, '');
  if ([...store.reviews.values()].some((r) => r.session_id === sessionId))
    return NextResponse.json(
      { type: 'https://edufurther.com/problems/review-already-exists', title: 'Already reviewed' },
      { status: 409 },
    );
  if (!joinPage && !mockReviewable(mentorId).some((s) => s.session_id === sessionId))
    return new NextResponse(null, { status: 404 });
  const ints = (k: string, lo: number, hi: number) =>
    Number.isInteger(b[k]) && (b[k] as number) >= lo && (b[k] as number) <= hi;
  const ok =
    ints('overall_rating', 1, 5) &&
    ints('valuable_rating', 1, 5) &&
    ints('nps_recommend_score', 1, 10) &&
    ['communication_rating', 'knowledge_rating', 'support_rating', 'practicality_rating'].every(
      (k) => SCALE.includes(String(b[k])),
    ) &&
    typeof b.public_review === 'string' &&
    b.public_review.trim().length > 0;
  if (!ok) return new NextResponse(null, { status: 422 });
  const now = Date.now();
  const r = {
    id: `mine-${now}`,
    session_id: sessionId,
    reviewed_for: mentorId,
    created_at: new Date(now).toISOString(),
    editable_until: new Date(now + MOCK_EDIT_WINDOW_MS).toISOString(),
    overall_rating: b.overall_rating as number,
    public_review: (b.public_review as string).trim(),
    communication_rating: String(b.communication_rating),
    knowledge_rating: String(b.knowledge_rating),
    support_rating: String(b.support_rating),
    practicality_rating: String(b.practicality_rating),
    valuable_rating: b.valuable_rating as number,
    nps_recommend_score: b.nps_recommend_score as number,
    private_review: typeof b.private_review === 'string' ? b.private_review : null,
  };
  store.reviews.set(r.id, r);
  return NextResponse.json(reviewRead(r), { status: 201 });
}
