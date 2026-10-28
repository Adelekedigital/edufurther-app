import { NextResponse, type NextRequest } from 'next/server';
import { mockMessagesContext, mockSend, mockThread } from '@/lib/api/mock/messages';
import { pendingOk, problem } from '@/lib/api/mock/respond';

type Params = { params: Promise<{ userId: string }> };

/** MOCK of GET /api/v1/me/messages/{user_id}?before=&after=&limit= (the chat). ENABLE_MOCK_API=1 only. */
export async function GET(req: NextRequest, { params }: Params) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const { userId } = await params;
  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get('limit') ?? 50);
  if (!Number.isInteger(limit) || limit < 0 || limit > 100)
    return problem(422, { title: 'Validation failed' });
  const res = mockThread(mockMessagesContext(req).role, userId, {
    before: sp.get('before'),
    after: sp.get('after'),
    limit,
  });
  if (res === 'notFound') return problem(404, { title: 'Not found' });
  if (res === 'badRequest') return problem(422, { title: 'Validation failed' });
  return pendingOk('GET /api/v1/me/messages/{user_id}', res);
}

/** MOCK of POST /api/v1/me/messages/{user_id}: 201 new, 200 for a repeated client_id. */
export async function POST(req: Request, { params }: Params) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  const { userId } = await params;
  const body = ((await req.json().catch(() => null)) ?? {}) as Parameters<typeof mockSend>[2];
  const res = mockSend(mockMessagesContext(req).role, userId, body);
  if ('status' in res)
    return problem(res.status, { title: 'Refused', ...(res.type ? { type: res.type } : {}) });
  return pendingOk('POST /api/v1/me/messages/{user_id}', res.ok, {
    status: res.created ? 201 : 200,
  });
}
