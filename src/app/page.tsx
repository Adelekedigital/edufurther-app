import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { RESOLVE_IN_BROWSER, fetchHome } from '@/lib/api/data/home';
import { HomeResolver } from './_shell/HomeResolver';
import { ACCESS_TOKEN_HEADER } from '@/lib/vendor/supabase/server';

/**
 * `/` has no page of its own: each viewer goes to their home (lib/api/data/home).
 * Usually a 307. When the server can't tell who is signed in in time, it
 * renders HomeResolver instead and the browser decides: a member is never sent
 * to Explore for a slow backend. Either way the answer is per request (the
 * page reads headers, so it is dynamic and uncached) and holds nothing of the
 * viewer, so no browser or CDN keeps one viewer's answer for another.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The proxy's verified token, set for `/` only; absent = signed out or unknown.
  const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
  const { mockViewer } = await searchParams;
  const home = await fetchHome({
    accessToken,
    mockViewer: typeof mockViewer === 'string' ? mockViewer : null,
  });
  if (home === RESOLVE_IN_BROWSER) return <HomeResolver />;
  redirect(home);
}
