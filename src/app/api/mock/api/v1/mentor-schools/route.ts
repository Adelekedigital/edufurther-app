import { NextResponse } from 'next/server';
import { pendingOk, problem } from '@/lib/api/mock/respond';

const SCHOOLS = [
  'University of Oxford',
  'University of Edinburgh',
  'University of Toronto',
  'Carnegie Mellon University',
  'TU Munich',
  'University of British Columbia',
  'University of Manchester',
  'Boston University',
];

/**
 * MOCK of GET /api/v1/mentor-schools (PENDING BACKEND, PRD Invite Landing PR
 * 1): the top schools of bookable mentors, most mentors first, in the Page
 * envelope. `limit` 1 to 20 (default 5), 422 outside. ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const raw = new URL(req.url).searchParams.get('limit');
  const limit = raw === null ? 5 : Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20)
    return problem(422, { detail: 'limit must be 1 to 20' });
  await new Promise((r) => setTimeout(r, 120));
  return pendingOk('GET /api/v1/mentor-schools', {
    data: SCHOOLS.slice(0, limit).map((name) => ({ name })),
    next_cursor: null,
  });
}
