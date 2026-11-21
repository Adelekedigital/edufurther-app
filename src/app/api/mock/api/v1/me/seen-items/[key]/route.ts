import { NextResponse } from 'next/server';
import { problem } from '@/lib/api/mock/respond';
import { SEEN_KEY } from '@/lib/utils/whatsNew';

/**
 * MOCK of PUT /api/v1/me/seen-items/{key} (PENDING BACKEND, lib/api/data/seenItems):
 * 204 for a valid key, 422 for anything else, as the backend. Keeps nothing:
 * the mock viewers never call /me, and the tab's own seen list covers a visit.
 * ENABLE_MOCK_API=1 only.
 */
export async function PUT(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { key } = await params;
  if (!SEEN_KEY.test(key)) return problem(422, { title: 'Unprocessable Content' });
  await new Promise((r) => setTimeout(r, 120));
  return new NextResponse(null, { status: 204 });
}
