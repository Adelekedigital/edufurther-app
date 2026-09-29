import { NextResponse } from 'next/server';
import { authoredRead, reviewRead, store } from '@/lib/api/mock/reviewStore';

/**
 * MOCK of GET /api/v1/reviews/{id} (AuthoredReviewRead, the author only;
 * the mock viewer wrote every stored review). ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ review_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { review_id } = await ctx.params;
  const r = store.reviews.get(review_id);
  return r ? NextResponse.json(authoredRead(r)) : new NextResponse(null, { status: 404 });
}

/** MOCK of PATCH /api/v1/reviews/{id}: 409 once the edit window has shut. ENABLE_MOCK_API=1 only. */
export async function PATCH(req: Request, ctx: { params: Promise<{ review_id: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { review_id } = await ctx.params;
  const r = store.reviews.get(review_id);
  if (!r) return new NextResponse(null, { status: 404 });
  if (Date.parse(r.editable_until) <= Date.now()) return new NextResponse(null, { status: 409 });
  const b = (await req.json()) as Record<string, unknown>;
  await new Promise((res) => setTimeout(res, 300));
  const next = { ...r };
  for (const k of Object.keys(next) as (keyof typeof next)[]) {
    if (k in b && b[k] !== undefined && !['id', 'session_id', 'reviewed_for'].includes(k)) {
      (next as Record<string, unknown>)[k] = b[k];
    }
  }
  store.reviews.set(r.id, next);
  return NextResponse.json(reviewRead(next));
}
