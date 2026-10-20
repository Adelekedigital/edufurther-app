import { NextResponse } from 'next/server';
import { MOCK_ARTS, setMockCover, type MockCover } from '@/lib/api/mock/coverStore';
import { MOCK_COUNTRIES, setMockItems } from '@/lib/api/mock/catalog';
import { setMockText, type MockText } from '@/lib/api/mock/profileTextStore';
import { COVER_KEYS } from '@/lib/utils/cover';
import { setMockLinkedIn } from '@/lib/api/mock/linksStore';
import { problem } from '@/lib/api/mock/respond';

const invalid = (pointer: string) =>
  problem(422, { title: 'Validation failed', errors: [{ pointer, detail: 'Invalid value' }] });

/**
 * MOCK of PATCH /api/v1/users/{user_id}/profile: cover, names, About and
 * where they're from (origin_country_id: a catalog id or null),
 * full_name, social_linkedin (a profile link, or null to clear), and the
 * pending current_country_id and primary_role.
 * Partial like the backend: only the fields sent are written. Names can't be
 * cleared (422) and are at most 100 characters; About at most 1500, blank is
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
  // full_name splits on the first word, as the backend does; one word is a 422.
  if ('full_name' in body) {
    const v = body.full_name;
    if (typeof v !== 'string' || !v.trim() || v.length > 1000) return invalid('/full_name');
    const [first, ...rest] = v.trim().split(/\s+/);
    if (!rest.length || first!.length > 100 || rest.join(' ').length > 100)
      return invalid('/full_name');
    text.first_name = first;
    text.last_name = rest.join(' ');
  }
  if ('about_me' in body) {
    const v = body.about_me;
    if (v !== null && (typeof v !== 'string' || v.length > 1500)) return invalid('/about_me');
    text.about_me = typeof v === 'string' && v.trim() ? v.trim() : null;
  }
  // PENDING BACKEND #8: true stamps the draft, false clears it.
  if ('about_me_drafted' in body)
    text.about_me_drafted_at = body.about_me_drafted === true ? new Date().toISOString() : null;
  if ('origin_country_id' in body) {
    const v = body.origin_country_id;
    if (v !== null && !MOCK_COUNTRIES.some((c) => c.id === v)) return invalid('/origin_country_id');
    setMockItems(userId, { origin_country_id: v as string | null });
  }
  // The country they live in (edufurtherbe #500).
  if ('current_country_id' in body) {
    const v = body.current_country_id;
    if (v !== null && !MOCK_COUNTRIES.some((c) => c.id === v))
      return invalid('/current_country_id');
    setMockItems(userId, { current_country_id: v as string | null });
  }
  if ('social_linkedin' in body && !setMockLinkedIn(body.social_linkedin))
    return invalid('/social_linkedin');
  // PENDING BACKEND (Mentor Onboarding B3): "Continue as a mentee" writes the role.
  if ('primary_role' in body) {
    if (body.primary_role !== 'mentee' && body.primary_role !== 'mentor')
      return invalid('/primary_role');
    setMockItems(userId, { primary_role: body.primary_role });
  }
  await new Promise((r) => setTimeout(r, 300));
  setMockText(userId, text);
  setMockCover(userId, next);
  // The contract answers 204 with no body.
  return new NextResponse(null, { status: 204 });
}
