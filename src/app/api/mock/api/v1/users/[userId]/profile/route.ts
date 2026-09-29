import { NextResponse } from 'next/server';
import { MOCK_ARTS, setMockCover, type MockCover } from '@/lib/api/mock/coverStore';
import { setMockText, type MockText } from '@/lib/api/mock/profileTextStore';
import { COVER_KEYS } from '@/lib/utils/cover';

const invalid = (pointer: string) =>
  NextResponse.json(
    { title: 'Validation failed', status: 422, errors: [{ pointer, detail: 'Invalid value' }] },
    { status: 422 },
  );

/**
 * MOCK of PATCH /api/v1/users/{user_id}/profile: cover, names and About.
 * Partial like the backend: only the fields sent are written. Names can't be
 * cleared (422) and are at most 100 characters; About at most 5000, blank is
 * null. ENABLE_MOCK_API=1 only.
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
  const text: MockText = {};
  for (const k of ['first_name', 'last_name'] as const) {
    if (!(k in body)) continue;
    const v = body[k];
    if (typeof v !== 'string' || !v.trim() || v.trim().length > 100) return invalid(`/${k}`);
    text[k] = v.trim();
  }
  if ('about_me' in body) {
    const v = body.about_me;
    if (v !== null && (typeof v !== 'string' || v.length > 5000)) return invalid('/about_me');
    text.about_me = typeof v === 'string' && v.trim() ? v.trim() : null;
  }
  await new Promise((r) => setTimeout(r, 300));
  setMockText(userId, text);
  const saved = setMockCover(userId, next);
  return NextResponse.json({
    user_id: userId,
    cover_color: saved.cover_color,
    cover_art: saved.cover_art,
  });
}
