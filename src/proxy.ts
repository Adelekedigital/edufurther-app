import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_HEADER,
  SESSION_HINT_HEADER,
  refreshSessionCookies,
} from '@/lib/vendor/supabase/server';
import { isEnterPath } from '@/lib/utils/sessionEnter';

/**
 * Next 16 proxy (formerly middleware): keeps the Supabase session cookie fresh
 * on page navigations, so a returning visitor's token is valid before the page
 * calls the API, and tells the render who is signed in (SESSION_HINT_HEADER),
 * so it draws the member or guest chrome first instead of swapping after load.
 */
export function proxy(request: NextRequest) {
  return refreshSessionCookies(request, ({ userId, accessToken }) => {
    const headers = new Headers(request.headers);
    // Always ours: a value a client sent under this name is replaced, or
    // removed when the check failed (no hint: the browser decides, as before).
    if (userId === undefined) headers.delete(SESSION_HINT_HEADER);
    else headers.set(SESSION_HINT_HEADER, userId ?? 'none');
    // Only `/` (to pick the viewer's home) and `/sessions/{id}/enter` (to
    // record an arrival, ADR 0009) call the API on the server. A client's own
    // value is removed on every path first.
    headers.delete(ACCESS_TOKEN_HEADER);
    const path = request.nextUrl.pathname;
    if (accessToken && (path === '/' || isEnterPath(path))) {
      headers.set(ACCESS_TOKEN_HEADER, accessToken);
    }
    return NextResponse.next({ request: { headers } });
  });
}

export const config = {
  // Pages only: not the API (proxied or mock), Next assets, or static files.
  matcher: ['/((?!api/|_next/|brand/|pwa-icon/|favicon.ico|manifest.webmanifest|.*\\..*).*)'],
};
