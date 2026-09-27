import { NextResponse } from 'next/server';
import { FEATURED } from '@/lib/api/mock/fixtures';

/**
 * PHASE A MOCK of GET /api/v1/featured-mentor — shape settled in backend reply
 * round 2 #11, not built yet: 200 with the mentor, or 200 with `null`.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const at = new Date(Date.now() + 30 * 60 * 60 * 1000);
  at.setUTCMinutes(0, 0, 0);
  return NextResponse.json({ ...FEATURED, next_available_at: at.toISOString() });
}
