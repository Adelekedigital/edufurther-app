import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MENTOR_ONBOARDING_LIVE } from '@/lib/config/auth';
import { MentorApplicationScreen } from './_components/MentorApplicationScreen';

export const metadata: Metadata = {
  title: 'Your mentor application',
  description: 'Where your mentor application stands.',
};

/** /mentor-application (Mentor Onboarding PRD F3): on its flag, like /onboarding/mentor. */
export default function MentorApplicationPage() {
  if (!MENTOR_ONBOARDING_LIVE) notFound();
  return <MentorApplicationScreen />;
}
