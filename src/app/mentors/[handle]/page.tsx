import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MentorProfileScreen } from './_components/MentorProfileScreen';

export const metadata: Metadata = {
  title: 'Mentor profile',
  description: 'A mentor’s background, sessions and track record on EduFurther.',
};

/** `/mentors/{slug or id}` — some mentors have no slug, so the id works too. */
export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  // A malformed %-sequence (e.g. /mentors/%E0) must not crash the render: keep
  // the raw value and let the API answer 404 → "This mentor profile isn't available".
  let handle = raw;
  try {
    handle = decodeURIComponent(raw);
  } catch {}
  // The screen reads ?tab= (useSearchParams), which needs a Suspense boundary.
  // Keyed by mentor: moving to another profile starts fresh (tab filter, booking).
  return (
    <Suspense>
      <MentorProfileScreen key={handle} handle={handle} />
    </Suspense>
  );
}
