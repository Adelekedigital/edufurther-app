import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import { FEATURED, MENTORS } from '@/lib/api/mock/fixtures';
import { mockReviews } from '@/lib/api/mock/reviews';

type Page = components['schemas']['Page_MentorReviewRead_'];

/**
 * MOCK of GET /api/v1/mentors/{handle}/reviews → Page[MentorReviewRead], newest
 * first. `session_type` filters; `cursor` is an offset. ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request, ctx: { params: Promise<{ handle: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { handle } = await ctx.params;
  const m = [FEATURED, ...MENTORS].find((x) => x.id === handle || x.slug === handle);
  if (!m) return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));

  const q = new URL(req.url).searchParams;
  const type = q.get('session_type');
  const limit = Math.min(50, Math.max(1, Number(q.get('limit')) || 10));
  const from = Number(q.get('cursor') ?? 0);
  if (!Number.isInteger(from) || from < 0) return new NextResponse(null, { status: 422 });
  const all = mockReviews(m.id).filter((r) => !type || r.session_type?.id === type);
  const body: Page = {
    data: all.slice(from, from + limit),
    next_cursor: from + limit < all.length ? String(from + limit) : null,
  };
  return NextResponse.json(body);
}
