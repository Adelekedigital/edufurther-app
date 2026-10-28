import { NextResponse } from 'next/server';
import { mockMessagesContext, mockRead } from '@/lib/api/mock/messages';
import { problem } from '@/lib/api/mock/respond';

/** MOCK of POST /api/v1/me/messages/{user_id}/read { up_to }: 204, forward only. ENABLE_MOCK_API=1 only. */
export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await params;
  const body = (await req.json().catch(() => null)) as { up_to?: unknown } | null;
  if (typeof body?.up_to !== 'string') return problem(422, { title: 'Validation failed' });
  const res = mockRead(mockMessagesContext(req).role, userId, body.up_to);
  if (res === 'notFound') return problem(404, { title: 'Not found' });
  if (res === 'badRequest') return problem(422, { title: 'Validation failed' });
  return new NextResponse(null, { status: 204 });
}
