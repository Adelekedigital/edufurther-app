import { NextResponse } from 'next/server';
import { searchMentees } from '@/lib/api/mock/adminCredits';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/mentees?q= (Admin PRD A9). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const q = new URL(req.url).searchParams.get('q') ?? '';
  return ok('/api/v1/admin/mentees', 'get', { data: searchMentees(q), next_cursor: null });
}
