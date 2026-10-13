import { NextResponse } from 'next/server';
import { MOCK_COUNTRIES } from '@/lib/api/mock/catalog';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/catalog/countries. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/catalog/{catalogue}', 'get', { data: MOCK_COUNTRIES, next_cursor: null });
}
