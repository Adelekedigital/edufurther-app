import { NextResponse, type NextRequest } from 'next/server';
import { mockAvailabilityState, mockNextAvailableAt } from '@/lib/api/mock/availability';
import { MENTORS, OFFERINGS } from '@/lib/api/mock/fixtures';

/**
 * PHASE A MOCK of GET /api/v1/mentors, following the backend's stated contract
 * (docs/handoff/explore-backend-reply.md): ANY-of across `offering`, narrowed by `q`; `total` on the first page,
 * 422 for an unknown offering or a foreign cursor, `limit` 1..50, default 10.
 * Answers only when ENABLE_MOCK_API=1.
 */
export async function GET(req: NextRequest) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') ?? '').trim().toLowerCase();
  const offerings = sp.getAll('offering').filter(Boolean);
  const limit = Number(sp.get('limit') ?? 10);
  const cursor = sp.get('cursor');

  const problem = (detail: string) =>
    NextResponse.json(
      { type: 'about:blank', title: 'Unprocessable Content', status: 422, detail },
      { status: 422, headers: { 'content-type': 'application/problem+json' } },
    );

  if (offerings.length > 10) return problem('At most 10 offerings.');
  if (offerings.some((o) => !OFFERINGS.some((x) => x.code === o)))
    return problem('Unknown offering.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return problem('limit must be 1..50.');
  const start = cursor === null ? 0 : Number(cursor.replace(/^c/, ''));
  if (cursor !== null && (!/^c\d+$/.test(cursor) || Number.isNaN(start)))
    return problem('Bad cursor.');

  const rows = MENTORS.filter((m) => {
    const hay = [m.first_name, m.last_name, m.institution, m.study_course, m.degree]
      .join(' ')
      .toLowerCase();
    return (
      (!q || hay.includes(q)) &&
      (offerings.length === 0 ||
        offerings.some((o) => (m.offerings ?? []).some((x) => x.slug === o)))
    );
  });
  // next_available_at / next_available_state: one source with the mocked slots
  // (lib/api/mock/availability.ts), so the modal's first time equals the card's.
  const now = Date.now();
  const page = rows.slice(start, start + limit).map((m) => ({
    ...m,
    next_available_at: mockNextAvailableAt(m.id, now),
    next_available_state: mockAvailabilityState(m.id),
  }));
  const next = start + limit < rows.length ? `c${start + limit}` : null;

  // Enough latency to see skeletons and the refresh bar in dev.
  await new Promise((r) => setTimeout(r, 450));
  // `total` as the backend ships it (PR #230): integer on the first page, null after.
  return NextResponse.json({
    data: page,
    next_cursor: next,
    total: cursor === null ? rows.length : null,
  });
}
