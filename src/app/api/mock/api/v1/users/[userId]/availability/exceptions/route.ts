import { NextResponse } from 'next/server';
import { addException, exceptions } from '@/lib/api/mock/exceptionStore';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/users/{id}/availability/exceptions. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return ok('/api/v1/users/{user_id}/availability/exceptions', 'get', exceptions);
}

/** MOCK of POST /api/v1/users/{id}/availability/exceptions: 422 for bad dates or half a time range. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 150));
  const r = addException(body);
  return r.ok
    ? ok('/api/v1/users/{user_id}/availability/exceptions', 'post', r.body, { status: r.status })
    : problem(r.status, r.problem);
}
