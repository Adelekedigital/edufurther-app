import { NextResponse } from 'next/server';
import { MOCK_ARTS, setMockCover, type MockCover } from '@/lib/api/mock/coverStore';
import { COVER_KEYS } from '@/lib/utils/cover';

const invalid = (pointer: string) =>
  NextResponse.json(
    { title: 'Validation failed', status: 422, errors: [{ pointer, detail: 'Invalid value' }] },
    { status: 422 },
  );

/**
 * MOCK of PATCH /api/v1/users/{user_id}/profile, the cover fields only. Partial
 * like the backend: only the fields sent are written. ENABLE_MOCK_API=1 only.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return invalid('');
  const next: Partial<MockCover> = {};
  if ('cover_color' in body) {
    const c = body.cover_color;
    if (c !== null && !(COVER_KEYS as readonly unknown[]).includes(c))
      return invalid('/cover_color');
    next.cover_color = c as MockCover['cover_color'];
  }
  if ('cover_art' in body) {
    if (!(MOCK_ARTS as readonly unknown[]).includes(body.cover_art)) return invalid('/cover_art');
    next.cover_art = body.cover_art as MockCover['cover_art'];
  }
  await new Promise((r) => setTimeout(r, 300));
  const saved = setMockCover(userId, next);
  return NextResponse.json({
    user_id: userId,
    cover_color: saved.cover_color,
    cover_art: saved.cover_art,
  });
}
