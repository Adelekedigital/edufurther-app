import { NextResponse } from 'next/server';
import { mockEmailValues } from '@/lib/api/mock/adminEmails';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/email-values (PRD 28). ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/admin/email-values', 'get', { data: mockEmailValues(), next_cursor: null });
}
