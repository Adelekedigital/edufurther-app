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
  const { handle } = await params;
  // The screen reads ?tab= (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <MentorProfileScreen handle={decodeURIComponent(handle)} />
    </Suspense>
  );
}
