import { createServerClient } from '@supabase/ssr';
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
 * Proxy (src/proxy.ts): refresh an expiring session and pass the new cookies to
 * both the request (for this render) and the response (for the browser).
 */
export async function refreshSessionCookies(
  request: NextRequest,
  next: () => NextResponse,
): Promise<NextResponse> {
  let response = next();
  if (!authConfigured) return response;
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Verifies the JWT and refreshes it when expired; the result itself is unused.
  await sb.auth.getClaims();
  return response;
}
