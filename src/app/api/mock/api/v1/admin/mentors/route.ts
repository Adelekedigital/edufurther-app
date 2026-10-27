import { NextResponse } from 'next/server';
import { mockMentorRows } from '@/lib/api/mock/adminMentors';
import { ok, problem } from '@/lib/api/mock/respond';

const TABS = ['applications', 'approved', 'paused', 'not_approved'] as const;

/** MOCK of GET /api/v1/admin/mentors?tab=&q= (Admin PRD A3). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const url = new URL(req.url);
  const tab = TABS.find((t) => t === url.searchParams.get('tab'));
  if (!tab) return problem(422, { title: 'Validation failed' });
  await new Promise((r) => setTimeout(r, 300));
  return ok('/api/v1/admin/mentors', 'get', {
    data: mockMentorRows(tab, url.searchParams.get('q') ?? ''),
    next_cursor: null,
  });
}
