import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ONBOARDING_LIVE } from '@/lib/config/auth';
import { OnboardingEntry } from './_components/OnboardingEntry';

export const metadata: Metadata = { title: 'Getting started' };

/**
 * The way into onboarding (PRD rev 95): reads who is signed in and goes to
 * the mentee or mentor flow, keeping the query (a guest's `for/sid/time`).
 */
export default function OnboardingEntryPage() {
  if (!ONBOARDING_LIVE) notFound();
  // It reads the query: rendered on the client, inside a boundary.
  return (
    <Suspense>
      <OnboardingEntry />
    </Suspense>
  );
}
