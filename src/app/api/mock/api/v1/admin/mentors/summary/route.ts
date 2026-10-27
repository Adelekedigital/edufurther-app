import { NextResponse } from 'next/server';
import { mockMentorSummary } from '@/lib/api/mock/adminMentors';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/mentors/summary (Admin PRD A2). ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/admin/mentors/summary', 'get', mockMentorSummary());
}
