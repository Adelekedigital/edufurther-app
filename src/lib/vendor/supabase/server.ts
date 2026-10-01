import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, authConfigured } from './config';

/**
 * Server-side Supabase clients (vendor seam). Two shapes, because Next gives
 * cookies two ways: a route handler reads/writes `cookies()`, the proxy reads
 * the request and writes the response.
 */

/** Magic-link landing: swap the one-time `code` for a session cookie. */
export async function exchangeCodeForSession(code: string): Promise<boolean> {
  if (!authConfigured) return false;
  const jar = await cookies();
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => jar.set(name, value, options)),
    },
  });
  const { error } = await sb.auth.exchangeCodeForSession(code);
  return !error;
}

/**
 * Request header the proxy sets for the page render: the signed-in user's id,
 * or "none". A hint for which chrome to draw first (no wordmark-then-sidebar
 * swap on refresh), never an authorization claim: data calls carry their own
 * token. On every path the proxy runs on, it replaces or removes whatever a
 * client sent under this name; paths its matcher skips (e.g. ones with a dot)
 * can carry a client's own value, which only changes that client's chrome.
 */
export const SESSION_HINT_HEADER = 'x-ef-session';

/**
 * Request header carrying the access token the proxy just verified (and, if
 * needed, refreshed and saved), for the one render that calls the API on the
 * server (`/`). The render never builds a Supabase client: one there could
 * refresh the token without being able to save the new cookies, leaving the
 * browser a rotated-out refresh token. Set only for `/`; any client value is
 * removed.
 */
export const ACCESS_TOKEN_HEADER = 'x-ef-access-token';

/**
 * Proxy (src/proxy.ts): refresh an expiring session, pass the new cookies to
 * both the request (for this render) and the response (for the browser), and
 * hand `respond` the verified user id: null when there's no session (or auth
 * is off), undefined when the check failed (e.g. a refresh that didn't reach
 * Supabase), so a signed-in visitor isn't drawn as a guest by mistake.
 */
export async function refreshSessionCookies(
  request: NextRequest,
  respond: (session: {
    userId: string | null | undefined;
    accessToken: string | null;
  }) => NextResponse,
): Promise<NextResponse> {
  if (!authConfigured) return respond({ userId: null, accessToken: null });
  const refreshed: { name: string; value: string; options: CookieOptions }[] = [];
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        refreshed.push(...list);
      },
    },
  });
  // Verifies the JWT and refreshes it when expired.
  // No session: no data and no error. A failed check carries an error.
  const { data, error } = await sb.auth.getClaims();
  const sub = data?.claims?.sub;
  const userId = error ? undefined : typeof sub === 'string' && sub !== '' ? sub : null;
  // The token getClaims just checked (any refresh already went to setAll).
  const accessToken = userId
    ? ((await sb.auth.getSession()).data.session?.access_token ?? null)
    : null;
  // Built after the refresh, so this render sees the new cookies.
  const response = respond({ userId, accessToken });
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
