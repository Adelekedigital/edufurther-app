import { NextResponse } from 'next/server';
import { mentorStatus, pause } from '@/lib/api/mock/mentorStatusStore';

/** MOCK of POST /api/v1/users/{id}/mentor-profile/pause (optional return_on). ENABLE_MOCK_API=1 only. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { return_on?: unknown } | null;
  await new Promise((r) => setTimeout(r, 200));
  const status = pause(body);
  return status === 200
    ? NextResponse.json(mentorStatus)
    : NextResponse.json(
        { type: 'about:blank', title: 'Unprocessable Content', status },
        { status, headers: { 'content-type': 'application/problem+json' } },
      );
}
