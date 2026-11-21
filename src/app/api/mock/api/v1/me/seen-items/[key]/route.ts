import { NextResponse } from 'next/server';
import { problem } from '@/lib/api/mock/respond';
import { safeDecode } from '@/lib/utils/text';
import { SEEN_KEY } from '@/lib/utils/whatsNew';

/**
 * MOCK of PUT /api/v1/me/seen-items/{key} (lib/api/data/seenItems):
 * 204 for a valid key, 422 for anything else, as the backend. The client
 * encodes the key (its colon arrives as %3A), so it is decoded first. Keeps
 * nothing: the mock viewers never call /me, and the tab's own seen list
 * covers a visit. ENABLE_MOCK_API=1 only.
 */
export async function PUT(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const key = safeDecode((await params).key);
  if (key === null || !SEEN_KEY.test(key)) return problem(422, { title: 'Unprocessable Content' });
  await new Promise((r) => setTimeout(r, 120));
  return new NextResponse(null, { status: 204 });
}
