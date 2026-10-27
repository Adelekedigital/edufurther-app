import { NextResponse } from 'next/server';
import { menteeCredits } from '@/lib/api/mock/adminCredits';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/admin/mentees/{user_id}/credits (Admin PRD A10): 404 for
 * anyone who isn't a mentee in the store. ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 250));
  const body = menteeCredits(userId);
  if (!body) return new NextResponse(null, { status: 404 });
  return ok('/api/v1/admin/mentees/{user_id}/credits', 'get', body);
}
