import { NextResponse } from 'next/server';
import { MOCK_VIEWER_ID, STEPS, mockProgress, setMockStep } from '@/lib/api/mock/onboardingStore';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of PUT /api/v1/me/onboarding {last_step} (backend #479). ENABLE_MOCK_API=1 only. */
export async function PUT(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { last_step?: unknown } | null;
  const step = body?.last_step;
  if (typeof step !== 'string' || !(STEPS as readonly string[]).includes(step))
    return problem(422, { title: 'Validation failed', errors: [{ pointer: '/last_step' }] });
  await new Promise((r) => setTimeout(r, 200));
  setMockStep(MOCK_VIEWER_ID, step);
  return ok('/api/v1/me/onboarding', 'put', mockProgress(MOCK_VIEWER_ID)!);
}
