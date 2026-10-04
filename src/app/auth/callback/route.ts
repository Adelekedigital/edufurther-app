import { NextResponse, type NextRequest } from 'next/server';
import { failureReason } from '@/app/_auth/failureReason';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { exchangeCodeForSession } from '@/lib/vendor/supabase/server';

/**
 * Where Supabase sends the browser back: the email's magic link, and Google's
 * consent screen. Both carry `code` (PKCE); swapping it sets the session
 * cookie. A link only works in the browser that asked for the email — on
 * another device the login page says to type the 6-digit code instead.
 *
 * A refusal arrives as `error` instead, and the two ways in need different
 * words: a Google sign-in someone cancelled is not a broken link.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const next = safeReturnTo(params.get('next'));
  const ok = code ? await exchangeCodeForSession(code) : false;
  const to = ok ? next : `/login?error=${failureReason(params)}&next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(to, request.nextUrl.origin));
}
