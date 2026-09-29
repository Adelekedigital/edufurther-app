import { NextResponse } from 'next/server';
import { problem, removeRule } from '@/lib/api/mock/bookingPrefs';

/** MOCK of DELETE /api/v1/users/{id}/availability/rules/{rule_id}. ENABLE_MOCK_API=1 only. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { ruleId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 150));
  const status = removeRule(ruleId);
  return status === 200
    ? NextResponse.json({ deleted: true })
    : NextResponse.json(problem(404, 'Not found'), {
        status,
        headers: { 'content-type': 'application/problem+json' },
      });
}
