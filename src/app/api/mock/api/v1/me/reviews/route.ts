import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import { ok } from '@/lib/api/mock/respond';

type Page = components['schemas']['Page_OwnReviewRead_'];
type OwnReview = components['schemas']['OwnReviewRead'];

/**
 * MOCK of GET /api/v1/me/reviews (#459): reviews written **about** the caller,
 * newest first and **including withdrawn ones** (only the subject may see those).
 * Feeds the dashboard session-quality quote, which takes the newest
 * `withdrawn: false` review. The newest here is withdrawn on purpose, so the dev
 * card exercises the skip; the deleted-author / no-offering shapes follow.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

  const reviews: OwnReview[] = [
    {
      // Newest, but withdrawn — the quote must skip it.
      id: 'rev-0001-withdrawn',
      created_at: iso(2),
      public_review: 'Changed my mind about this one.',
      session_id: 'sess-9001',
      reviewed_for: 'mentor-self',
      session_value: 3,
      withdrawn: true,
      author_first_name: 'Noah',
      author_last_initial: 'K',
      author_institution: null,
      author_deleted: false,
      session_type: { id: 'st-visa', name: 'Visa and interview' },
      report: null,
    },
    {
      // Newest showable — this is the dev quote.
      id: 'rev-0002-showable',
      created_at: iso(6),
      public_review:
        'Honestly the clearest hour I have spent on my application. Amara walked me through the visa interview questions and I left knowing exactly what to prepare.',
      session_id: 'sess-9002',
      reviewed_for: 'mentor-self',
      session_value: 5,
      withdrawn: false,
      author_first_name: 'Amara',
      author_last_initial: 'O',
      author_institution: 'University of Lagos',
      author_deleted: false,
      session_type: { id: 'st-visa', name: 'Visa and interview' },
      report: null,
    },
    {
      // A deleted author with no offering recorded — the attribution falls back.
      id: 'rev-0003-deleted',
      created_at: iso(20),
      public_review: 'Really practical advice on scholarship essays.',
      session_id: null,
      reviewed_for: 'mentor-self',
      session_value: 4,
      withdrawn: false,
      author_first_name: null,
      author_last_initial: null,
      author_institution: null,
      author_deleted: true,
      session_type: null,
      report: null,
    },
  ];

  const body: Page = { data: reviews, next_cursor: null };
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/me/reviews', 'get', body);
}
