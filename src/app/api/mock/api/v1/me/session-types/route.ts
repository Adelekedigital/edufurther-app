import { NextResponse } from 'next/server';
import { mockOwnSessionTypes } from '@/lib/api/mock/sessionTypes';

/** MOCK of GET /api/v1/me/session-types (every state, is_active flagged). ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  return NextResponse.json({ data: mockOwnSessionTypes(), next_cursor: null });
}
