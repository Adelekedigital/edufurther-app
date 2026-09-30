import { NextResponse } from 'next/server';
import { MOCK_LANGUAGES, setMockItems } from '@/lib/api/mock/catalog';

/**
 * MOCK of PUT /api/v1/users/{id}/languages: replaces the whole list. An
 * unknown id or a repeat is a 422, as on the backend. ENABLE_MOCK_API=1 only.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ userId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { languages?: unknown } | null;
  const list = Array.isArray(body?.languages) ? body.languages : null;
  const ids = list?.map((l) => (l as { language_id?: unknown })?.language_id);
  if (
    !ids ||
    new Set(ids).size !== ids.length ||
    !ids.every((id) => MOCK_LANGUAGES.some((l) => l.id === id))
  )
    return NextResponse.json(
      { title: 'Validation failed', status: 422, errors: [{ pointer: '/languages' }] },
      { status: 422 },
    );
  await new Promise((r) => setTimeout(r, 300));
  setMockItems(userId, { language_ids: ids as string[] });
  return new NextResponse(null, { status: 204 });
}
