import { NextResponse } from 'next/server';
import { creditLog } from '@/lib/api/mock/adminCredits';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/credit-log?type=&cursor=&mentee_id= (Admin PRD A11). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const p = new URL(req.url).searchParams;
  const body = creditLog(p.get('type'), p.get('cursor'), p.get('mentee_id'));
  if (!body) return problem(422, { title: 'Validation failed' });
  return ok('/api/v1/admin/credit-log', 'get', body);
}
