import { NextResponse } from 'next/server';
import { mentorStatus, resume } from '@/lib/api/mock/mentorStatusStore';

/** MOCK of POST /api/v1/users/{id}/mentor-profile/resume. ENABLE_MOCK_API=1 only. */
export async function POST() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const status = resume();
  return status === 200
    ? NextResponse.json(mentorStatus)
    : NextResponse.json(
        { type: 'about:blank', title: 'Not Found', status },
        { status, headers: { 'content-type': 'application/problem+json' } },
      );
}
