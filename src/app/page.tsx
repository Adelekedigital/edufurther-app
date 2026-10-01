import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchHome } from '@/lib/api/data/home';
import { ACCESS_TOKEN_HEADER } from '@/lib/vendor/supabase/server';

/**
 * `/` has no page of its own: each viewer goes to their home (lib/api/data/home).
 * A 307 per request, so no browser or CDN keeps one viewer's answer for another.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The proxy's verified token, set for `/` only; absent = signed out or unknown.
  const accessToken = (await headers()).get(ACCESS_TOKEN_HEADER);
  const { mockViewer } = await searchParams;
  redirect(
    await fetchHome({
      accessToken,
      mockViewer: typeof mockViewer === 'string' ? mockViewer : null,
    }),
  );
}
