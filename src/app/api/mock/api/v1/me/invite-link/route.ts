import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of POST /api/v1/me/invite-link: the viewer's personal invite link. The
 * backend creates it on the first call (201) and returns it after (200); the
 * mock always answers 200 with one sample code. ENABLE_MOCK_API=1 only.
 */
export async function POST() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 140));
  return ok('/api/v1/me/invite-link', 'post', { code: 'damilola-7k2x', active: true });
}
