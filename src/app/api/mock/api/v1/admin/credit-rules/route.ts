import { NextResponse } from 'next/server';
import { creditRules } from '@/lib/api/mock/adminCredits';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/credit-rules (Admin PRD A12). ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/admin/credit-rules', 'get', creditRules());
}
