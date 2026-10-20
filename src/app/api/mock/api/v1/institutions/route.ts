import { NextResponse } from 'next/server';
import { MOCK_INSTITUTIONS } from '@/lib/api/mock/institutions';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/institutions?q= (names starting with, then containing). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = Number(url.searchParams.get('limit')) || 10;
  await new Promise((r) => setTimeout(r, 150));
  const rows = MOCK_INSTITUTIONS.map((i) => ({
    id: i.id,
    name: i.name,
    web_page: null,
    country: { code: i.code, display_name: i.country },
  }));
  const data = !q
    ? []
    : [
        ...rows.filter((r) => r.name.toLowerCase().startsWith(q)),
        ...rows.filter(
          (r) => !r.name.toLowerCase().startsWith(q) && r.name.toLowerCase().includes(q),
        ),
      ].slice(0, limit);
  return ok('/api/v1/institutions', 'get', { data, next_cursor: null });
}
