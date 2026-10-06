import { NextResponse } from 'next/server';
import { addInterest, endpointExists, listInterest } from '@/lib/api/mock/interestStore';

/** An unbuilt path on the real API: plain JSON, not the problem+json envelope. */
const notFound = () =>
  NextResponse.json({ detail: 'Not Found' }, { status: 404 });

/** MOCK of GET /api/v1/me/interest. 200 with an empty list, never 404. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  if (!endpointExists()) return notFound();
  await new Promise((r) => setTimeout(r, 80));
  return NextResponse.json({ data: listInterest(), next_cursor: null });
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
    : NextResponse.json(
        { type: 'about:blank', title: 'Unprocessable Content', status },
        { status, headers: { 'content-type': 'application/problem+json' } },
      );
}
