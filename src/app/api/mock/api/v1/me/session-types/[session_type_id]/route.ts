import { NextResponse } from 'next/server';
import { mockDeleteSessionType, mockEditSessionType } from '@/lib/api/mock/sessionTypes';
import { ok, problem } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ session_type_id: string }> };

/**
 * MOCK of PATCH /api/v1/me/session-types/{id} → {updated: true}; 422 errors[]
 * like the backend, 409 on a name already used. ENABLE_MOCK_API=1 only.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 300));
  const r = mockEditSessionType(session_type_id, body);
  if (r.status === 200)
    return ok('/api/v1/me/session-types/{session_type_id}', 'patch', { updated: true });
  return problem(r.status, r.errors ? { errors: r.errors } : {});
}

/** MOCK of DELETE: 204, 404, or 202 {scheduled, deletes_after, booked_count} (round 4). */
export async function DELETE(_req: Request, ctx: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { session_type_id } = await ctx.params;
  await new Promise((r) => setTimeout(r, 300));
  const r = mockDeleteSessionType(session_type_id);
  if (r.result === 'gone') return problem(404);
  if (r.result === 'scheduled')
    return ok(
      '/api/v1/me/session-types/{session_type_id}',
      'delete',
      { scheduled: true, deletes_after: r.deletes_after, booked_count: r.booked_count },
      { status: 202 },
    );
  return new NextResponse(null, { status: 204 });
}
