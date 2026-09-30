import { NextResponse } from 'next/server';
import { MOCK_DEGREE_LEVELS } from '@/lib/api/mock/entries';

/** MOCK of GET /api/v1/catalog/degree-levels. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return NextResponse.json({ data: MOCK_DEGREE_LEVELS, next_cursor: null });
}
