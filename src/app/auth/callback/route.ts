import { NextResponse, type NextRequest } from 'next/server';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { exchangeCodeForSession } from '@/lib/vendor/supabase/server';

/**
 * Magic-link landing. The email's link carries `code` (PKCE); swapping it sets
 * the session cookie. It only works in the browser that asked for the email —
 * on another device the login page says to type the 6-digit code instead.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeReturnTo(request.nextUrl.searchParams.get('next'));
  const ok = code ? await exchangeCodeForSession(code) : false;
  const to = ok ? next : `/login?error=link&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(to, request.nextUrl.origin));
}
