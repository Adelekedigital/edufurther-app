import { NextResponse } from 'next/server';
import { grantConnection } from '@/lib/api/mock/calendarConnectionStore';

/**
 * Stands in for Google's consent screen plus the backend callback, so the
 * popup has somewhere to land locally. Writes the grant the page is polling
 * for, then says so — the real callback answers JSON too, which is why the
 * page closes the popup itself rather than relying on a redirect.
 */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  grantConnection();
  return new NextResponse(
    '<!doctype html><meta charset="utf-8"><title>Connected</title>' +
      '<p style="font:16px system-ui;padding:24px">Connected. You can close this window.</p>',
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}
