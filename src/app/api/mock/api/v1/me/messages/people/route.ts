import { NextResponse, type NextRequest } from 'next/server';
import { mockMessagesContext, mockPeople } from '@/lib/api/mock/messages';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/me/messages/people?q= (New message). ENABLE_MOCK_API=1 only. */
export async function GET(req: NextRequest) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const { role } = mockMessagesContext(req);
  const data = mockPeople(role, req.nextUrl.searchParams.get('q') ?? '');
  return ok('/api/v1/me/messages/people', 'get', { data, next_cursor: null });
}
