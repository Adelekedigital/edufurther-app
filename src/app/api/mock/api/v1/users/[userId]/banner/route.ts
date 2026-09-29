import { NextResponse } from 'next/server';
import { mockBannerUrl, mockCover, setMockCover } from '@/lib/api/mock/coverStore';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * MOCK of POST /api/v1/users/{user_id}/banner: multipart `file`, JPEG, PNG or
 * WebP up to 5 MB, else 422; answers {banner_url} like the backend. The image
 * is kept in memory and served by /api/mock/banners/{id}. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > 5 * 1024 * 1024 ||
    !TYPES.includes(file.type)
  )
    return new NextResponse(null, { status: 422 });
  await new Promise((r) => setTimeout(r, 600));
  const version = (mockCover(userId).banner?.version ?? 0) + 1;
  setMockCover(userId, { banner: { bytes: await file.arrayBuffer(), type: file.type, version } });
  return NextResponse.json({ banner_url: mockBannerUrl(userId) });
}

/**
 * MOCK of DELETE /api/v1/users/{user_id}/banner: 204, whether or not there was
 * one; the cover's colour and art show again. ENABLE_MOCK_API=1 only.
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 400));
  setMockCover(userId, { banner: undefined });
  return new NextResponse(null, { status: 204 });
}
