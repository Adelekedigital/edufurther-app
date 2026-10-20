import { NextResponse, type NextRequest } from 'next/server';
import { failureReason } from '@/app/_auth/failureReason';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { exchangeCodeForSession } from '@/lib/vendor/supabase/server';

/**
 * Where Supabase sends the browser back: Google's consent screen (and an old
 * email's magic link). Both carry `code` (PKCE); swapping it sets the session
 * cookie.
 *
 * A Google sign-in goes back to the screen it started on (`auth=google`), so
 * the screen can name a new account, show the toast and pick the account's
 * home; `mode`, `role` and `next` come along. A refusal goes back there too,
 * with the reason. A magic link that worked goes straight to `next`. That
 * legacy path never saves a mentor role (only the sign-in screen does), so an
 * old mentor link signs in as a mentee; left as is (owner, 2026-10-20).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const rawNext = params.get('next');
  // A next that fails the check is dropped, not replaced with a default.
  const next = (rawNext && safeReturnTo(rawNext, '')) || null;
  const ok = code ? await exchangeCodeForSession(code) : false;
  const google = params.get('from') === 'google';

  const back = new URLSearchParams();
  if (params.get('role') === 'mentor') back.set('role', 'mentor');
  if (next) back.set('next', next);
  const screen = params.get('mode') === 'signup' ? '/signup' : '/login';

  let to: string;
  if (ok && !google) to = next ?? '/';
  else {
    back.set(ok ? 'auth' : 'error', ok ? 'google' : failureReason(params));
    to = `${screen}?${back}`;
  }
  return NextResponse.redirect(new URL(to, request.nextUrl.origin));
}
