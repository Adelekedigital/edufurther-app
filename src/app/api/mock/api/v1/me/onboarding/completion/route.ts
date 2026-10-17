import { NextResponse } from 'next/server';
import { MOCK_VIEWER_ID, completeMock, mockMissing } from '@/lib/api/mock/onboardingStore';
import { okStatus, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of POST /api/v1/me/onboarding/completion with PRD B3's rule: 409 names
 * what is missing (PENDING BACKEND #3), else 201 once and 200 after.
 */
export async function POST() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  const missing = mockMissing(MOCK_VIEWER_ID);
  if (missing.length)
    return problem(409, {
      type: '/problems/onboarding-incomplete',
      title: 'Onboarding incomplete',
      missing,
    });
  const { status, completed_at } = completeMock(MOCK_VIEWER_ID);
  // The contract: 201 with the record the first time, a bare 200 after.
  if (status === 200) return new NextResponse(null, { status: 200 });
  return okStatus('/api/v1/me/onboarding/completion', 'post', 201, {
    completed_at,
    last_step: 'plans',
  });
}
