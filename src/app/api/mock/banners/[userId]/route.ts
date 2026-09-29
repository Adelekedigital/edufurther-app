import { NextResponse } from 'next/server';
import { mockCover } from '@/lib/api/mock/coverStore';

/** MOCK: serves a banner uploaded to the mock (the backend's is a storage URL). */
export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const b = mockCover(userId).banner;
  if (!b) return new NextResponse(null, { status: 404 });
  return new NextResponse(b.bytes, {
    headers: { 'Content-Type': b.type, 'X-Content-Type-Options': 'nosniff' },
  });
}
