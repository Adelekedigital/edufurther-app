import { NextResponse } from 'next/server';
import { mockChats, mockMessagesContext } from '@/lib/api/mock/messages';
import { maskLast } from '@/lib/api/mock/previewSessions';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/me/messages (PRD Messages). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const { role, empty } = mockMessagesContext(req);
  const chats = mockChats(role, empty);
  // Preview as user: masked until a reveal (backend PR 5).
  const data = chats.data.map((c) => ({ ...c, last: maskLast(req, c.last) ?? null }));
  return ok('/api/v1/me/messages', 'get', { ...chats, data });
}
