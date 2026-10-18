import { NextResponse } from 'next/server';
import { isMockApplicationState, markApprovedSeen } from '@/lib/api/mock/mentorApplicationStore';
import { pendingOk, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of POST /api/v1/me/mentor-application/approved-seen (PENDING BACKEND,
 * Mentor Onboarding B3): sets approved_seen_at once, idempotent; 409 unless
 * approved. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  // A page that picked its state (`?mockApplication=`, as /me reads it) is answered for it.
  let asked: string | null = null;
  try {
    const referer = req.headers.get('referer');
    if (referer) asked = new URL(referer).searchParams.get('mockApplication');
  } catch {}
  if (isMockApplicationState(asked))
    return asked === 'approved' || asked === 'seen'
      ? pendingOk('POST /api/v1/me/mentor-application/approved-seen', {
          approved_seen_at: new Date().toISOString(),
        })
      : problem(409, { title: 'Not approved', type: '/problems/mentor-application-not-approved' });
  const r = markApprovedSeen();
  if (r.status === 409)
    return problem(409, {
      title: 'Not approved',
      type: '/problems/mentor-application-not-approved',
    });
  return pendingOk('POST /api/v1/me/mentor-application/approved-seen', { approved_seen_at: r.at });
}
