import { NextResponse } from 'next/server';
import { mockNextAvailableAt } from '@/lib/api/mock/availability';
import { FEATURED } from '@/lib/api/mock/fixtures';

/**
 * PHASE A MOCK of GET /api/v1/featured-mentor — shape settled in backend reply
 * round 2 #11, not built yet: 200 with the mentor, or 200 with `null`.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return NextResponse.json({
    ...FEATURED,
    next_available_at: mockNextAvailableAt(FEATURED.id),
    next_available_state: 'open',
  });
}
