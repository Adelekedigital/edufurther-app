import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchHome } from '@/lib/api/data/home';
import { SESSION_HINT_HEADER } from '@/lib/vendor/supabase/server';

/**
 * `/` has no page of its own: each viewer goes to their home (lib/api/data/home).
 * A 307 per request, so no browser or CDN keeps one viewer's answer for another.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // "none" = the proxy verified there's no session; anything else may be a member.
  const hint = (await headers()).get(SESSION_HINT_HEADER);
  const { mockViewer } = await searchParams;
  redirect(
    await fetchHome({
      signedIn: hint !== 'none',
      mockViewer: typeof mockViewer === 'string' ? mockViewer : null,
    }),
  );
}
