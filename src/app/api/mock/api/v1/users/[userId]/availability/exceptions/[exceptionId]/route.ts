import { NextResponse } from 'next/server';
import { removeException } from '@/lib/api/mock/exceptionStore';

/** MOCK of DELETE /api/v1/users/{id}/availability/exceptions/{exception_id}. ENABLE_MOCK_API=1 only. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ exceptionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { exceptionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 150));
  const status = removeException(exceptionId);
  return status === 204
    ? new NextResponse(null, { status })
    : NextResponse.json(
        { type: 'about:blank', title: 'Not found', status },
        { status, headers: { 'content-type': 'application/problem+json' } },
      );
}
