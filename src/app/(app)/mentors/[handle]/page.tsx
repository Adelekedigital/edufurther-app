import type { Metadata } from 'next';
import { Suspense } from 'react';
import { lookupMentorPreviewOnServer } from '@/lib/api/data/mentorPreview';
import { mockOrigin } from '@/lib/api/data/serverBackend';
import { MentorProfileScreen } from './_components/MentorProfileScreen';
import { mentorPreviewMetadata } from './previewMetadata';
import { safeDecode } from '@/lib/utils/text';

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

/** `/mentors/{slug or id}` — some mentors have no slug, so the id works too. */
export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  // A malformed %-sequence (e.g. /mentors/%E0) must not crash the render: keep
  // the raw value and let the API answer 404 → "This mentor profile isn't available".
  const handle = safeDecode(raw) ?? raw;
  // The screen reads ?tab= (useSearchParams), which needs a Suspense boundary.
  // Keyed by mentor: moving to another profile starts fresh (tab filter, booking).
  return (
    <Suspense>
      <MentorProfileScreen key={handle} handle={handle} />
    </Suspense>
  );
}
