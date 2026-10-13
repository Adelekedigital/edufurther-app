import { NextResponse } from 'next/server';
import { authoredRead, ratingsOf, reviewRead, store } from '@/lib/api/mock/reviewStore';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/reviews/{id} (AuthoredReviewRead, the author only;
 * the mock viewer wrote every stored review). ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ review_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { review_id } = await ctx.params;
  const r = store.reviews.get(review_id);
  return r
    ? ok('/api/v1/reviews/{review_id}', 'get', authoredRead(r))
    : new NextResponse(null, { status: 404 });
}

const int = (v: unknown, lo: number, hi: number) =>
  Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/**
 * MOCK of PATCH /api/v1/reviews/{id}, validated as the backend does: only the
 * review's own fields, each optional, on their scales; the public text can't be
 * emptied; only `private_review` may be null. 409 once the window has shut.
 * ENABLE_MOCK_API=1 only.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ review_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { review_id } = await ctx.params;
  const r = store.reviews.get(review_id);
  if (!r) return new NextResponse(null, { status: 404 });
  if (Date.parse(r.editable_until) <= Date.now()) return new NextResponse(null, { status: 409 });
  const b = (await req.json()) as Record<string, unknown>;
  await new Promise((res) => setTimeout(res, 300));
  const valid =
    (b.overall_rating === undefined || int(b.overall_rating, 1, 5)) &&
    (b.valuable_rating === undefined || int(b.valuable_rating, 1, 5)) &&
    (b.nps_recommend_score === undefined || int(b.nps_recommend_score, 1, 10)) &&
    (b.public_review === undefined ||
      (typeof b.public_review === 'string' && b.public_review.trim().length > 0)) &&
    (b.private_review === undefined ||
      b.private_review === null ||
      typeof b.private_review === 'string');
  const ratings = ratingsOf(b, true);
  if (!valid || !ratings) return new NextResponse(null, { status: 422 });
  const next = { ...r, ...ratings };
  if (b.overall_rating !== undefined) next.overall_rating = b.overall_rating as number;
  if (b.valuable_rating !== undefined) next.valuable_rating = b.valuable_rating as number;
  if (b.nps_recommend_score !== undefined)
    next.nps_recommend_score = b.nps_recommend_score as number;
  if (b.public_review !== undefined) next.public_review = (b.public_review as string).trim();
  if (b.private_review !== undefined) next.private_review = b.private_review as string | null;
  store.reviews.set(r.id, next);
  return ok('/api/v1/reviews/{review_id}', 'patch', reviewRead(next));
}
