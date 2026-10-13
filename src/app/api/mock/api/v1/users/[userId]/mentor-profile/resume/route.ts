import { NextResponse } from 'next/server';
import { resume } from '@/lib/api/mock/mentorStatusStore';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of POST /api/v1/users/{id}/mentor-profile/resume. ENABLE_MOCK_API=1 only. */
export async function POST() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const status = resume();
  return status === 200
    ? ok('/api/v1/users/{user_id}/mentor-profile/resume', 'post', { resumed: true })
    : problem(status, { title: 'Not Found' });
}
