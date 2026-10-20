import { NextResponse } from 'next/server';
import { editMockLink, removeMockLink } from '@/lib/api/mock/linksStore';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of PATCH /api/v1/me/links/{link_id}: a new value (the platform is fixed). ENABLE_MOCK_API=1 only. */
export async function PATCH(req: Request, ctx: { params: Promise<{ linkId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  const { linkId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { value?: unknown } | null;
  if (typeof body?.value !== 'string')
    return problem(422, { title: 'Validation failed', errors: [{ pointer: '/value' }] });
  const r = editMockLink(linkId, body.value);
  if (!r.ok)
    return r.status === 404
      ? problem(404, { title: 'Not Found' })
      : problem(422, { title: 'Validation failed', errors: [{ pointer: '/value' }] });
  return ok('/api/v1/me/links/{link_id}', 'patch', r.link);
}

/** MOCK of DELETE /api/v1/me/links/{link_id}: 204, or 404 when it isn't theirs. ENABLE_MOCK_API=1 only. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ linkId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  const { linkId } = await ctx.params;
  return removeMockLink(linkId)
    ? new NextResponse(null, { status: 204 })
    : problem(404, { title: 'Not Found' });
}
