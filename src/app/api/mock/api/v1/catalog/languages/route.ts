import { NextResponse } from 'next/server';
import { MOCK_LANGUAGES } from '@/lib/api/mock/catalog';

/**
 * MOCK of GET /api/v1/catalog/languages: `q` filters by name, `common=true`
 * gives the short list. ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const common = url.searchParams.get('common') === 'true';
  await new Promise((r) => setTimeout(r, 200));
  const data = MOCK_LANGUAGES.filter(
    (l) => (!common || l.common) && (!q || l.display_name.toLowerCase().includes(q)),
  ).map(({ common: _c, ...l }) => l);
  return NextResponse.json({ data, next_cursor: null });
}
