import { NextResponse } from 'next/server';
import { mockMessagesContext, mockSettings } from '@/lib/api/mock/messages';
import { pendingOk, problem } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/me/messages/settings (backend PR 3). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  return pendingOk('GET /api/v1/me/messages/settings', mockSettings(mockMessagesContext(req).role));
}

/** MOCK of PATCH /api/v1/me/messages/settings. */
export async function PATCH(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const body = (await req.json().catch(() => null)) as { unread_emails?: unknown } | null;
  if (typeof body?.unread_emails !== 'boolean') return problem(422, { title: 'Validation failed' });
  const { role } = mockMessagesContext(req);
  return pendingOk('PATCH /api/v1/me/messages/settings', mockSettings(role, body.unread_emails));
}
