import { NextResponse } from 'next/server';
import { mockEmailList } from '@/lib/api/mock/adminEmails';
import { pendingOk } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/emails (PRD 28, PENDING BACKEND). ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return pendingOk('GET /api/v1/admin/emails', { data: mockEmailList(), next_cursor: null });
}
