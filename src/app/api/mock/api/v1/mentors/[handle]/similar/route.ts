import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import { mockAvailabilityState, mockNextAvailableAt } from '@/lib/api/mock/availability';
import { FEATURED, MENTORS, mockProfileIndex } from '@/lib/api/mock/fixtures';

type Page = components['schemas']['Page_SimilarMentorRead_'];

/**
 * MOCK of GET /api/v1/mentors/{handle}/similar → Page[SimilarMentorRead]:
 * other mentors sharing an offering, each with the one they share. Every
 * seventh mentor has none, so the hidden card has data to render. Like the
 * backend: never a 404 (an unknown handle is an empty list), at most three.
 * `hidden-mentor` stands for a mentor whose profile 404s (pending, unlisted or
 * unbookable) but who shares offerings, for the "isn't available" page.
 * ENABLE_MOCK_API=1 only.
 */
/** A hidden mentor's handle: /mentors/hidden-mentor 404s (no fixture), this answers. */
const HIDDEN = 'hidden-mentor';

export async function GET(_req: Request, ctx: { params: Promise<{ handle: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { handle } = await ctx.params;
  const all = [FEATURED, ...MENTORS];
  const me = handle === HIDDEN ? all[1] : all.find((m) => m.id === handle || m.slug === handle);
  if (!me) return NextResponse.json({ data: [], next_cursor: null } satisfies Page);
  await new Promise((r) => setTimeout(r, 300));

  const { i } = mockProfileIndex(me.id);
  if (i % 7 === 6) return NextResponse.json({ data: [], next_cursor: null } satisfies Page);
  const mine = new Set((me.offerings ?? []).map((o) => o.slug));
  const others = all.filter((m) => m.id !== me.id);
  // Rotate by index so neighbouring profiles suggest different people.
  const rotated = [...others.slice(i % others.length), ...others.slice(0, i % others.length)];
  const data = rotated
    .flatMap((m) => {
      const shared = (m.offerings ?? []).find((o) => mine.has(o.slug));
      return shared ? [{ m, shared }] : [];
    })
    .slice(0, 3)
    .map(({ m, shared }) => ({
      ...m,
      // Null whenever the mentor isn't taking bookings (backend #301).
      next_available_at: m.taking_bookings === false ? null : mockNextAvailableAt(m.id),
      next_available_state: m.taking_bookings === false ? 'none' : mockAvailabilityState(m.id),
      shared_offering: shared,
    }));
  return NextResponse.json({ data, next_cursor: null } satisfies Page);
}
