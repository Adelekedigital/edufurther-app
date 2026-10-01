import { NextResponse } from 'next/server';
import {
  MOCK_PHOTO_FOCUS,
  mockPhotoUrl,
  removeMockPhoto,
  setMockPhoto,
} from '@/lib/api/mock/photoStore';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * MOCK of POST /api/v1/users/{user_id}/avatar: multipart `file`, JPEG, PNG or
 * WebP up to 5 MB, else 422; answers {avatar_url, avatar_focus} like the
 * backend. ENABLE_MOCK_API=1 only.
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
  await new Promise((r) => setTimeout(r, 700));
  setMockPhoto(userId, await file.arrayBuffer(), file.type);
  return NextResponse.json({ avatar_url: mockPhotoUrl(userId), avatar_focus: MOCK_PHOTO_FOCUS });
}

/** MOCK of DELETE /api/v1/users/{user_id}/avatar (backend #319): 204, idempotent. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 600));
  removeMockPhoto(userId);
  return new NextResponse(null, { status: 204 });
}
