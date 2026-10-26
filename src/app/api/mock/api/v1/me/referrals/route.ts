import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/me/referrals: the invites the viewer has sent, newest
 * first. One friend who signed up but hasn't finished their profile, so the
 * invite's first step still reads as to do. ENABLE_MOCK_API=1 only.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 140));
  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return ok('/api/v1/me/referrals', 'get', [
    {
      id: '00000000-0000-4000-8000-0000000000a1',
      code: 'friend-a1b2',
      invitee_email: null,
      invited_at: iso(3),
      signed_up_at: iso(3),
      qualified_at: null,
    },
  ]);
}
