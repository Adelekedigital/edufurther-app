import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_HINT_HEADER, refreshSessionCookies } from '@/lib/vendor/supabase/server';

/**
 * Next 16 proxy (formerly middleware): keeps the Supabase session cookie fresh
 * on page navigations, so a returning visitor's token is valid before the page
 * calls the API, and tells the render who is signed in (SESSION_HINT_HEADER),
 * so it draws the member or guest chrome first instead of swapping after load.
 */
export function proxy(request: NextRequest) {
  return refreshSessionCookies(request, (userId) => {
    const headers = new Headers(request.headers);
    // Always ours: a value a client sent under this name is replaced.
    headers.set(SESSION_HINT_HEADER, userId ?? 'none');
    return NextResponse.next({ request: { headers } });
  });
}

export const config = {
  // Pages only: not the API (proxied or mock), Next assets, or static files.
  matcher: ['/((?!api/|_next/|brand/|pwa-icon/|favicon.ico|manifest.webmanifest|.*\\..*).*)'],
};
