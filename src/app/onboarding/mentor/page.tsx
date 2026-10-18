import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MENTOR_ONBOARDING_LIVE } from '@/lib/config/auth';
import { MentorOnboardingScreen } from './_components/MentorOnboardingScreen';

export const metadata: Metadata = {
  title: 'Mentor application',
  description: 'Tell us what you help with, where you studied, about you and when you can mentor.',
};

/**
 * Mentor onboarding (Mentor Onboarding.dc.html, PRD F1): help areas,
 * education, about you, hours, then submit. A focused page with the logo
 * header only. A 404 until mentor onboarding is on for this environment.
 */
export default function MentorOnboardingPage() {
  if (!MENTOR_ONBOARDING_LIVE) notFound();
  return (
    <Suspense>
      <MentorOnboardingScreen />
    </Suspense>
  );
}
