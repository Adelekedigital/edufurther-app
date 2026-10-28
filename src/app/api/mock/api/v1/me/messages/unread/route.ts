import { NextResponse } from 'next/server';
import { mockMessagesContext, mockUnread } from '@/lib/api/mock/messages';
import { pendingOk } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/me/messages/unread (the nav badge). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { role, empty } = mockMessagesContext(req);
  return pendingOk('GET /api/v1/me/messages/unread', { total: mockUnread(role, empty) });
}
