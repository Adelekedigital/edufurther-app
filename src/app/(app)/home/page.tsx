import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MenteeHomeGate } from './_components/MenteeHomeGate';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your next session and your progress on your study-abroad journey.',
};

export default function HomePage() {
  // Home reads ?invite=open (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense>
      <MenteeHomeGate />
    </Suspense>
  );
}
