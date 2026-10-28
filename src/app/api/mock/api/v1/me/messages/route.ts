import { NextResponse } from 'next/server';
import { mockChats, mockMessagesContext } from '@/lib/api/mock/messages';
import { pendingOk } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/me/messages (PRD Messages, backend PR 1). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const { role, empty } = mockMessagesContext(req);
  return pendingOk('GET /api/v1/me/messages', mockChats(role, empty));
}
