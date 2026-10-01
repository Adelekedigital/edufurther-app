import { NextResponse } from 'next/server';
import { addException, exceptions } from '@/lib/api/mock/exceptionStore';

/** MOCK of GET /api/v1/users/{id}/availability/exceptions. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return NextResponse.json(exceptions);
}

/** MOCK of POST /api/v1/users/{id}/availability/exceptions: 422 for bad dates or half a time range. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 150));
  const r = addException(body);
  const headers: Record<string, string> =
    r.status === 201 ? {} : { 'content-type': 'application/problem+json' };
  return NextResponse.json(r.json, { status: r.status, headers });
}
