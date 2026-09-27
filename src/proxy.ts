import { NextResponse, type NextRequest } from 'next/server';
import { refreshSessionCookies } from '@/lib/vendor/supabase/server';

/**
 * Next 16 proxy (formerly middleware): keeps the Supabase session cookie fresh
 * on page navigations, so a returning visitor's token is valid before the page
 * calls the API. No-op when auth is not configured.
 */
export function proxy(request: NextRequest) {
  return refreshSessionCookies(request, () => NextResponse.next({ request }));
}

export const config = {
  // Pages only: not the API (proxied or mock), Next assets, or static files.
  matcher: ['/((?!api/|_next/|brand/|pwa-icon/|favicon.ico|manifest.webmanifest|.*\\..*).*)'],
};
