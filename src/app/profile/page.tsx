import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isLegacyId } from '@/lib/utils/mentorPath';
import { LegacySessionRedirect } from './_components/LegacySessionRedirect';

export const metadata: Metadata = { title: 'Opening your session', robots: { index: false } };

/**
 * `/profile/?r=yes&sessId={legacy id}`: the old app's session links (its
 * video-room and email links). Members only, so a signed-out visitor logs in
 * first and comes back here (proxy). The id is looked up and the session page
 * opened; anything else at /profile goes home.
 */
export default async function LegacyProfileRoot({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).sessId;
  const sessId = typeof raw === 'string' ? raw : null;
  if (!sessId || !isLegacyId(sessId)) redirect('/');
  return <LegacySessionRedirect legacyId={sessId} />;
}
