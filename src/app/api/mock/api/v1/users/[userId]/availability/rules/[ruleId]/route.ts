import { NextResponse } from 'next/server';
import { removeRule } from '@/lib/api/mock/bookingPrefs';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of DELETE /api/v1/users/{id}/availability/rules/{rule_id}. ENABLE_MOCK_API=1 only. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { ruleId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 150));
  const status = removeRule(ruleId);
  return status === 200
    ? ok('/api/v1/users/{user_id}/availability/rules/{rule_id}', 'delete', { deleted: true })
    : problem(status, { title: 'Not found' });
}
