import { NextResponse, type NextRequest } from 'next/server';
import { enterSession } from '@/lib/api/data/sessionEnter';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { ENTER_PARAM, SESSION_ID } from '@/lib/utils/sessionEnter';
import { ACCESS_TOKEN_HEADER } from '@/lib/vendor/supabase/server';

/**
 * `/sessions/{id}/enter`: where Join and Rejoin link to (#207, ADR 0009). It
 * records the arrival on the server, then redirects to the call, so every way
 * of opening the link counts (click, middle-click, "open in new tab", drag),
 * the server's clock decides the window, and the call link never sits in the
 * page.
 *
 * A GET with a side effect: only a navigation started on this site (or typed,
 * or from a bookmark) may record anything, which Sec-Fetch-Site tells us; a
 * request that says it is a prefetch records nothing; and nothing links to it
 * with next/link, so the router never prefetches it.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {}
  // The proxy only cleans paths without a dot, so act on nothing else.
  if (!SESSION_ID.test(id)) return see(request, '/bookings');
  const page = `/sessions/${encodeURIComponent(id)}`;

  // Older browsers send no Sec-Fetch-Site; every current one does.
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return see(request, page);
  // A prefetch or prerender (a browser's speculation, a link preview) is not
  // someone arriving: record nothing.
  const purpose = `${request.headers.get('sec-purpose') ?? ''} ${request.headers.get('purpose') ?? ''}`;
  if (/prefetch/i.test(purpose)) return see(request, page);

  const outcome = await enterSession({
    sessionId: id,
    accessToken: request.headers.get(ACCESS_TOKEN_HEADER),
    origin: request.nextUrl.origin,
  });
  switch (outcome.to) {
    case 'call':
      return see(request, outcome.url);
    case 'login':
      return see(request, `/login?next=${encodeURIComponent(safeReturnTo(page, '/bookings'))}`);
    case 'page':
      return see(request, outcome.problem ? `${page}?${ENTER_PARAM}=${outcome.problem}` : page);
  }
}

/** 303: the browser follows with a GET, and nothing here may be cached. */
function see(request: NextRequest, to: string): NextResponse {
  const res = NextResponse.redirect(new URL(to, request.nextUrl.origin), 303);
  res.headers.set('Cache-Control', 'no-store');
  // The call's site learns nothing of our pages from the referrer.
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
