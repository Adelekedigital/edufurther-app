import { NextResponse } from 'next/server';
import { OFFERINGS } from '@/lib/api/mock/fixtures';
import { ok } from '@/lib/api/mock/respond';

/** PHASE A MOCK of GET /api/v1/catalog/service-offerings. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return ok('/api/v1/catalog/{catalogue}', 'get', { data: OFFERINGS, next_cursor: null });
}
