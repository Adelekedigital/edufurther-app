import { NextResponse, type NextRequest } from 'next/server';
import {
  LANDING_COOKIE,
  LANDING_MAX_AGE,
  encodeLanding,
  isMentorHome,
} from '@/lib/utils/landingHint';
import { verifiedUserId } from '@/lib/vendor/supabase/server';

/**
 * The mentor landing hint (lib/utils/landingHint), set by the server so it is
 * HttpOnly, bound to the Supabase user verified here (never an id the page
 * sends), and not cut to 7 days as Safari does with cookies a page writes.
 * PUT `{ home }` saves a mentor home; DELETE clears it. Same origin only.
 */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  return origin === null || origin === request.nextUrl.origin;
}

function answer(status: number): NextResponse {
  const res = new NextResponse(null, { status });
  res.headers.set('cache-control', 'no-store');
  return res;
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return answer(403);
  const body = (await request.json().catch(() => null)) as { home?: unknown } | null;
  const home = typeof body?.home === 'string' ? body.home : null;
  if (!home || !isMentorHome(home)) return answer(400);
  const userId = await verifiedUserId();
  if (!userId) return answer(401);
  const res = answer(204);
  res.cookies.set(LANDING_COOKIE, encodeLanding(userId, home), {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: LANDING_MAX_AGE,
  });
  return res;
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return answer(403);
  const res = answer(204);
  res.cookies.set(LANDING_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
