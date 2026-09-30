import { NextResponse } from 'next/server';
import { mockPhoto } from '@/lib/api/mock/photoStore';

/** MOCK: serves a photo uploaded to the mock (the backend's is a storage URL). */
export async function GET(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const p = mockPhoto(userId);
  if (!p) return new NextResponse(null, { status: 404 });
  return new NextResponse(p.bytes, {
    headers: { 'Content-Type': p.type, 'X-Content-Type-Options': 'nosniff' },
  });
}
