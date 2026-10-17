import { NextResponse } from 'next/server';
import { mockGoal, setMockGoal } from '@/lib/api/mock/onboardingStore';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/users/{user_id}/goal: the goal, or 404. ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 200));
  const g = mockGoal(userId);
  // field_of_study rides along: PENDING BACKEND #1.
  return g ? ok('/api/v1/users/{user_id}/goal', 'get', g) : problem(404, { title: 'Not Found' });
}

/** MOCK of PUT /api/v1/users/{user_id}/goal: replaces the goal and its lists. */
export async function PUT(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return problem(422, { title: 'Validation failed' });
  const field = body.field_of_study;
  if (field != null && (typeof field !== 'string' || field.trim().length > 100))
    return problem(422, { title: 'Validation failed', errors: [{ pointer: '/field_of_study' }] });
  await new Promise((r) => setTimeout(r, 250));
  setMockGoal(userId, body as Parameters<typeof setMockGoal>[1]);
  return ok('/api/v1/users/{user_id}/goal', 'put', mockGoal(userId)!);
}
