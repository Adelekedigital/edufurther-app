import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { lookupMentorPreviewOnServer } from '@/lib/api/data/mentorPreview';
import { mockOrigin } from '@/lib/api/data/serverBackend';
import { MentorProfileScreen } from './_components/MentorProfileScreen';
import { mentorPreviewMetadata } from './previewMetadata';
import { mentorProfilePath } from '@/lib/utils/mentorPath';
import { safeDecode } from '@/lib/utils/text';

/** A user id. Slugs are never minted in this shape, so only these are redirected. */
const ID_HANDLE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Query = Record<string, string | string[] | undefined>;

/** The request's own query (?book=, ?tab=, …), repeated keys kept. */
function queryString(q: Query): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) out.append(k, one);
  const s = out.toString();
  return s ? `?${s}` : '';
}

/** The link preview's lines, from the public profile (opengraph-image draws the picture). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle: raw } = await params;
  const handle = safeDecode(raw) ?? raw;
  return mentorPreviewMetadata(await lookupMentorPreviewOnServer(handle, await mockOrigin()));
}

/**
 * `/mentors/{slug or id}` — some mentors have no slug, so the id works too. An
 * id link to a mentor who has a slug 308s to the slug link, so old links and
 * shares settle on one address. Only ids are looked up here (the read is the
 * one generateMetadata makes, cached); a hidden, missing or failed read
 * renders, and the screen says so.
 */
export default async function MentorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Query>;
}) {
  const { handle: raw } = await params;
  // A malformed %-sequence (e.g. /mentors/%E0) must not crash the render: keep
  // the raw value and let the API answer 404 → "This mentor profile isn't available".
  const handle = safeDecode(raw) ?? raw;
  if (ID_HANDLE.test(handle)) {
    const mentor = await lookupMentorPreviewOnServer(handle, await mockOrigin());
    if (mentor?.slug && mentor.slug !== handle)
      permanentRedirect(`${mentorProfilePath(mentor)}${queryString(await searchParams)}`);
  }
  // The screen reads ?tab= (useSearchParams), which needs a Suspense boundary.
  // Keyed by mentor: moving to another profile starts fresh (tab filter, booking).
  return (
    <Suspense>
      <MentorProfileScreen key={handle} handle={handle} />
    </Suspense>
  );
}
