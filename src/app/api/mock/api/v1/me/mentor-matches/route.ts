import { NextResponse, type NextRequest } from 'next/server';
import { MOCK_VIEWER_ID, mockMatches } from '@/lib/api/mock/onboardingStore';
import { pendingOk, problem } from '@/lib/api/mock/respond';

/**
 * PENDING BACKEND (#4, PRD B4): GET /api/v1/me/mentor-matches?limit=&for_mentor=.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET(req: NextRequest) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get('limit') ?? 2);
  if (!Number.isInteger(limit) || limit < 1 || limit > 3)
    return problem(422, { title: 'Validation failed', errors: [{ pointer: '/limit' }] });
  await new Promise((r) => setTimeout(r, 600));
  const body = mockMatches(MOCK_VIEWER_ID, limit, sp.get('for_mentor'));
  return pendingOk('GET /api/v1/me/mentor-matches', body);
}
