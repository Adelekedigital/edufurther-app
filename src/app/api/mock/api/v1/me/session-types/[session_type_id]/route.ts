import { NextResponse } from 'next/server';
import { mockDeleteSessionType, mockPatchSessionType } from '@/lib/api/mock/sessionTypes';

type Ctx = { params: Promise<{ session_type_id: string }> };
const problem = (status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json(
    { type: 'about:blank', title: 'Error', status, ...extra },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

/** MOCK of PATCH /api/v1/me/session-types/{id} → {updated: true}. ENABLE_MOCK_API=1 only. */
export async function PATCH(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 300));
  const allowed = Object.fromEntries(
    Object.entries(body).filter(([k]) =>
      [
        'name',
        'description',
        'duration_minutes',
        'min_notice_minutes',
        'is_active',
        'icon',
      ].includes(k),
    ),
  );
  return mockPatchSessionType(session_type_id, allowed)
    ? NextResponse.json({ updated: true })
    : problem(404);
}

/** MOCK of DELETE: 204, 404, or 409 /problems/session-type-has-bookings + booked_count (#4). */
export async function DELETE(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  await new Promise((r) => setTimeout(r, 300));
  const r = mockDeleteSessionType(session_type_id);
  if (r.result === 'gone') return problem(404);
  if (r.result === 'booked')
    return problem(409, {
      type: '/problems/session-type-has-bookings',
      title: 'Session type has bookings',
      booked_count: r.count,
    });
  return new NextResponse(null, { status: 204 });
}
