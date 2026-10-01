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
 * token. The proxy always overwrites whatever a client sent under this name.
 */
export const SESSION_HINT_HEADER = 'x-ef-session';

/**
 * Proxy (src/proxy.ts): refresh an expiring session, pass the new cookies to
 * both the request (for this render) and the response (for the browser), and
 * hand `respond` the verified user id (null: not signed in, or auth is off).
 */
export async function refreshSessionCookies(
  request: NextRequest,
  respond: (userId: string | null) => NextResponse,
): Promise<NextResponse> {
  if (!authConfigured) return respond(null);
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
  const { data } = await sb.auth.getClaims();
  const sub = data?.claims?.sub;
  // Built after the refresh, so this render sees the new cookies.
  const response = respond(typeof sub === 'string' && sub !== '' ? sub : null);
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
