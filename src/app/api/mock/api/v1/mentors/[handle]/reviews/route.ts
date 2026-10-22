import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import { FEATURED, MENTORS, OFFERINGS } from '@/lib/api/mock/fixtures';
import { mockMentorReviewList } from '@/lib/api/mock/reviewList';
import { ok, problem } from '@/lib/api/mock/respond';

type Page = components['schemas']['Page_MentorReviewRead_'];

/**
 * MOCK of GET /api/v1/mentors/{handle}/reviews → Page[MentorReviewRead], newest
 * first. `offering` filters, repeatable and ANY-of, at most 10; an unknown slug
 * is a 422 and a blank one no filter (backend #522). `session_type` narrows
 * too (both must hold). `cursor` is an offset. ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request, ctx: { params: Promise<{ handle: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { handle } = await ctx.params;
  const m = [FEATURED, ...MENTORS].find((x) => x.id === handle || x.slug === handle);
  if (!m) return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));

  const q = new URL(req.url).searchParams;
  const invalid = (detail: string) => problem(422, { title: 'Unprocessable Content', detail });
  const offerings = q.getAll('offering').filter((o) => o.trim());
  if (offerings.length > 10) return invalid('At most 10 offerings.');
  if (offerings.some((o) => !OFFERINGS.some((x) => x.code === o)))
    return invalid('Unknown offering.');
  const type = q.get('session_type');
  const limit = Math.min(50, Math.max(1, Number(q.get('limit')) || 10));
  const from = Number(q.get('cursor') ?? 0);
  if (!Number.isInteger(from) || from < 0) return new NextResponse(null, { status: 422 });
  const all = mockMentorReviewList(m.id).filter(
    (r) =>
      (!type || r.session_type?.id === type) &&
      (offerings.length === 0 ||
        (r.service_offerings ?? []).some((o) => offerings.includes(o.slug))),
  );
  const body: Page = {
    data: all.slice(from, from + limit),
    next_cursor: from + limit < all.length ? String(from + limit) : null,
  };
  return ok('/api/v1/mentors/{handle}/reviews', 'get', body);
}
