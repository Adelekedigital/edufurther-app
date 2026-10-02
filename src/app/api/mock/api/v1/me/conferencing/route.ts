import { NextResponse } from 'next/server';
import { conferencing, setConferencing } from '@/lib/api/mock/mentorStatusStore';

/** MOCK of GET /api/v1/me/conferencing. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return NextResponse.json(conferencing);
}

/** MOCK of PATCH /api/v1/me/conferencing: custom_url only (https) with `custom`. */
export async function PATCH(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 150));
  const status = setConferencing(body);
  return status === 200
    ? NextResponse.json(conferencing)
    : NextResponse.json(
        { type: 'about:blank', title: 'Unprocessable Content', status },
        { status, headers: { 'content-type': 'application/problem+json' } },
      );
}
