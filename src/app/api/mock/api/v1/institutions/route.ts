import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/** The design's suggestion list (Mentor Onboarding.dc.html `UNIS`), with ISO countries. */
const INSTITUTIONS: [name: string, code: string, country: string][] = [
  ['University of Lagos', 'NG', 'Nigeria'],
  ['University of Ibadan', 'NG', 'Nigeria'],
  ['Obafemi Awolowo University', 'NG', 'Nigeria'],
  ['University of Ghana', 'GH', 'Ghana'],
  ['University of Nairobi', 'KE', 'Kenya'],
  ['Mississippi State University', 'US', 'United States'],
  ['University of Toronto', 'CA', 'Canada'],
  ['University College London', 'GB', 'United Kingdom'],
  ['University of Oxford', 'GB', 'United Kingdom'],
];

/** MOCK of GET /api/v1/institutions?q= (names starting with, then containing). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const limit = Number(url.searchParams.get('limit')) || 10;
  await new Promise((r) => setTimeout(r, 150));
  const rows = INSTITUTIONS.map(([name, code, display_name], i) => ({
    id: `inst-${i + 1}`,
    name,
    web_page: null,
    country: { code, display_name },
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
