import { NextResponse } from 'next/server';
import { mockCreateSessionType, mockOwnSessionTypes } from '@/lib/api/mock/sessionTypes';

/** MOCK of GET /api/v1/me/session-types (every state, is_active flagged). ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  return NextResponse.json({ data: mockOwnSessionTypes(), next_cursor: null });
}

/**
 * MOCK of POST /api/v1/me/session-types: questions in the same request (#1),
 * Idempotency-Key replays (#2), 422 errors[] (#5), 409 on a name already used.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 600));
  const r = mockCreateSessionType(body, req.headers.get('idempotency-key'));
  const headers: Record<string, string> =
    r.status === 201
      ? r.replayed
        ? { 'Idempotent-Replayed': 'true' }
        : {}
      : { 'content-type': 'application/problem+json' };
  return NextResponse.json(r.json, { status: r.status, headers });
}
