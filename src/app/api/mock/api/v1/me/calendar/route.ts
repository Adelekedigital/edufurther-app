import { NextResponse } from 'next/server';
import { readConnection, removeConnection } from '@/lib/api/mock/calendarConnectionStore';

/** MOCK of GET /api/v1/me/calendar. `null` = never connected, or disconnected. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 120));
  return NextResponse.json(readConnection());
}

/** MOCK of DELETE /api/v1/me/calendar. 404 when nothing was connected. */
export async function DELETE() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 150));
  return new NextResponse(null, { status: removeConnection() });
}
