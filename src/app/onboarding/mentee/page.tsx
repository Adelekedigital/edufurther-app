import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ONBOARDING_LIVE } from '@/lib/config/auth';
import { OnboardingScreen } from '../_components/OnboardingScreen';

export const metadata: Metadata = {
  title: 'Find your mentor',
  description: 'Tell us what you need and where you’re headed, then meet your top mentor matches.',
};

/**
 * Mentee onboarding (Mentee Onboarding v5.dc.html, PRD F1): help areas, study
 * plans, then the top 2 matches. Outside the app shell: a focused page with
 * the logo header only. A 404 until ONBOARDING_V5 is on for this environment.
 */
export default function OnboardingPage() {
  if (!ONBOARDING_LIVE) notFound();
  return <OnboardingScreen />;
}
