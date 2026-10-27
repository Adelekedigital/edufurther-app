import { NextResponse } from 'next/server';
import { bulkApproveMock } from '@/lib/api/mock/adminMentors';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of POST /api/v1/admin/mentors/approvals (A7): 1–50 ids. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { user_ids } = (await req.json().catch(() => ({}))) as { user_ids?: unknown };
  const ids = Array.isArray(user_ids)
    ? user_ids.filter((x): x is string => typeof x === 'string')
    : [];
  if (ids.length < 1 || ids.length > 50) return problem(422, { title: 'Validation failed' });
  await new Promise((r) => setTimeout(r, 500));
  return ok('/api/v1/admin/mentors/approvals', 'post', bulkApproveMock(ids));
}
