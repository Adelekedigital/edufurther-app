import { notFound, permanentRedirect } from 'next/navigation';
import { isLegacyId, queryString } from '@/lib/utils/mentorPath';
import { safeDecode } from '@/lib/utils/text';

/**
 * `/profile/{legacy id}`: the old app's profile links (shared, bookmarked,
 * in emails). They 308 to `/mentors/{legacy id}`, whose page resolves the id
 * and 308s again to the mentor's slug, or says the profile isn't available.
 * Anything else here is the ordinary 404.
 */
export default async function LegacyProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: raw } = await params;
  const id = safeDecode(raw) ?? raw;
  if (!isLegacyId(id)) notFound();
  permanentRedirect(`/mentors/${id}${queryString(await searchParams)}`);
}
