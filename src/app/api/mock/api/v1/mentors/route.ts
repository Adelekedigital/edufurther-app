import { NextResponse, type NextRequest } from 'next/server';
import { mockAvailabilityState, mockNextAvailableAt } from '@/lib/api/mock/availability';
import { MENTORS, OFFERINGS, mockCountries } from '@/lib/api/mock/fixtures';
import { ok, problem } from '@/lib/api/mock/respond';

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
  // Backend #521: only mentors whose stored time is open and inside N days.
  const withinRaw = sp.get('available_within_days');
  const within = withinRaw === null ? null : Number(withinRaw);

  const invalid = (detail: string) => problem(422, { title: 'Unprocessable Content', detail });

  if (offerings.length > 10) return invalid('At most 10 offerings.');
  if (offerings.some((o) => !OFFERINGS.some((x) => x.code === o)))
    return invalid('Unknown offering.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return invalid('limit must be 1..50.');
  if (within !== null && (!Number.isInteger(within) || within < 1 || within > 14))
    return invalid('available_within_days must be 1..14.');
  const start = cursor === null ? 0 : Number(cursor.replace(/^c/, ''));
  if (cursor !== null && (!/^c\d+$/.test(cursor) || Number.isNaN(start)))
    return invalid('Bad cursor.');

  const now = Date.now();
  const card = (m: (typeof MENTORS)[number]) => ({
    next_available_at: m.taking_bookings === false ? null : mockNextAvailableAt(m.id, now),
    next_available_state: m.taking_bookings === false ? 'none' : mockAvailabilityState(m.id),
  });
  // Backend #521: open, and before the window's end (half-open).
  const freeWithin = (c: ReturnType<typeof card>, end: number) =>
    c.next_available_state === 'open' &&
    !!c.next_available_at &&
    Date.parse(c.next_available_at) < end;
  const rows = MENTORS.filter((m) => {
    const hay = [m.first_name, m.last_name, m.institution, m.study_course, m.degree]
      .join(' ')
      .toLowerCase();
    return (
      (!q || hay.includes(q)) &&
      (offerings.length === 0 ||
        offerings.some((o) => (m.offerings ?? []).some((x) => x.slug === o))) &&
      (within === null || freeWithin(card(m), now + within * 86_400_000))
    );
  });
  // next_available_at / next_available_state: one source with the mocked slots
  // (lib/api/mock/availability.ts), so the modal's first time equals the card's.
  const page = rows.slice(start, start + limit).map((m) => ({
    ...m,
    ...mockCountries(m.id),
    // Not taking bookings: no times, as the backend sends (#301).
    ...card(m),
  }));
  const next = start + limit < rows.length ? `c${start + limit}` : null;

  // Enough latency to see skeletons and the refresh bar in dev.
  await new Promise((r) => setTimeout(r, 450));
  // `total` as the backend ships it (PR #230): integer on the first page, null after.
  return ok('/api/v1/mentors', 'get', {
    data: page,
    next_cursor: next,
    total: cursor === null ? rows.length : null,
  });
}
