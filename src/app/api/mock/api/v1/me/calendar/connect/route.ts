import { NextResponse } from 'next/server';
import { connectConfigured } from '@/lib/api/mock/calendarConnectionStore';

/**
 * MOCK of GET /api/v1/me/calendar/connect.
 *
 * Answers 500 by default, because that is what dev and a local backend do
 * today — the deployment has no Google client (backend reply #1). The detail
 * is withheld there too: it would name settings.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 120));
  if (!connectConfigured()) return new NextResponse(null, { status: 500 });
  return NextResponse.json({ consent_url: '/api/mock/api/v1/me/calendar/granted' });
}
