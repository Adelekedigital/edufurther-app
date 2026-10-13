import { NextResponse } from 'next/server';
import { addInterest, endpointExists, listInterest } from '@/lib/api/mock/interestStore';
import { ok, problem } from '@/lib/api/mock/respond';

/**
 * An unbuilt path on the real API answers FastAPI's own plain 404, not a
 * problem+json: so does the mock (the reader goes by the status alone).
 */
const notFound = () =>
  new NextResponse(JSON.stringify({ detail: 'Not Found' }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });

/** MOCK of GET /api/v1/me/interest. 200 with an empty list, never 404. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  if (!endpointExists()) return notFound();
  await new Promise((r) => setTimeout(r, 80));
  return ok('/api/v1/me/interest', 'get', { data: listInterest(), next_cursor: null });
}

/** MOCK of POST /api/v1/me/interest. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  if (!endpointExists()) return notFound();
  const body = await req.json().catch(() => null);
  await new Promise((r) => setTimeout(r, 150));
  const status = addInterest(body);
  return status === 204
    ? new NextResponse(null, { status: 204 })
    : problem(status, { title: 'Unprocessable Content' });
}
