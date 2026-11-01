import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_HEADER,
  SESSION_HINT_HEADER,
  refreshSessionCookies,
} from '@/lib/vendor/supabase/server';
import { isEnterPath } from '@/lib/utils/sessionEnter';
import { PROXY_SECRET_HEADER, backendOrigin, proxySecret } from '@/lib/backend';
import { LANDING_COOKIE, LANDING_PATHS, isLanding, landingHomeFor } from '@/lib/utils/landingHint';

/**
 * The same-origin API proxy (ADR 0003): `/api/v1/…` goes to BACKEND_URL with
 * the origin-lock header (backend #426), which a config rewrite can't add.
 * Whatever a client sent under that name is removed first, so only this
 * server's value ever reaches the backend; with no secret set, none does.
 * No backend (local dev on the mock): the request falls through and 404s.
 */
function forwardToBackend(request: NextRequest): NextResponse {
  const origin = backendOrigin();
  if (!origin) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.delete(PROXY_SECRET_HEADER);
  const secret = proxySecret();
  if (secret) headers.set(PROXY_SECRET_HEADER, secret);
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(new URL(`${pathname}${search}`, origin), { request: { headers } });
}

/**
 * Next 16 proxy (formerly middleware): forwards the API (above), and keeps the
 * Supabase session cookie fresh on page navigations, so a returning visitor's
 * token is valid before the page calls the API, and tells the render who is
 * signed in (SESSION_HINT_HEADER), so it draws the member or guest chrome first
 * instead of swapping after load.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === '/api/v1' || path.startsWith('/api/v1/')) return forwardToBackend(request);
  return refreshSessionCookies(request, ({ userId, accessToken }) => {
    // A mentor landing on Explore goes home before any of it is drawn (owner,
    // 2026-11-01; lib/utils/landingHint). Only for the user just verified.
    if (userId && LANDING_PATHS.has(path) && isLanding(request.headers)) {
      const home = landingHomeFor(request.cookies.get(LANDING_COOKIE)?.value, userId);
      if (home) {
        const res = NextResponse.redirect(new URL(home, request.url));
        res.headers.set('cache-control', 'no-store');
        return res;
      }
    }
    const headers = new Headers(request.headers);
    // Always ours: a value a client sent under this name is replaced, or
    // removed when the check failed (no hint: the browser decides, as before).
    if (userId === undefined) headers.delete(SESSION_HINT_HEADER);
    else headers.set(SESSION_HINT_HEADER, userId ?? 'none');
    // Only `/` (to pick the viewer's home) and `/sessions/{id}/enter` (to
    // record an arrival, ADR 0009) call the API on the server. A client's own
    // value is removed on every path first.
    headers.delete(ACCESS_TOKEN_HEADER);
    if (accessToken && (path === '/' || isEnterPath(path))) {
      headers.set(ACCESS_TOKEN_HEADER, accessToken);
    }
    return NextResponse.next({ request: { headers } });
  });
}

export const config = {
  // Pages (not the mock API, Next assets, or static files), and the proxied API.
  matcher: [
    '/((?!api/|_next/|brand/|pwa-icon/|favicon.ico|manifest.webmanifest|.*\\..*).*)',
    '/api/v1/:path*',
  ],
};
