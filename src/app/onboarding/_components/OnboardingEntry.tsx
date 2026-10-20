'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useViewer } from '@/lib/api/data/viewer';
import { Button } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { FLOW_COPY, MATCH_COPY } from '@/lib/copy/onboarding';
import { MENTOR_ONBOARDING_LIVE, NEW_MENTOR_HOME } from '@/lib/config/auth';
import { OnboardingFrame } from './OnboardingFrame';
import { Waiting } from './Waiting';
import styles from './OnboardingScreen.module.css';

/**
 * Where `/onboarding` sends each viewer. A member goes by the account only: a
 * mentor profile, or a mentor sign-up (`signedUpAsMentor`, set by the sign-up
 * flow). `role=mentor` never changes a member's path (owner, 2026-10-20: the
 * role is decided at sign-up and sticks); a guest carries it into sign-up.
 * Mentor onboarding has its own flag: off, mentors go to their home. On, a
 * new mentor applies; one with a profile goes to their application, which
 * sends an unfinished one back to the steps (PRD F4); an approved mentor has
 * nothing left to do here.
 */
export function onboardingDestination(
  viewer: ReturnType<typeof useViewer>,
  query: URLSearchParams,
): string | null {
  const keep = query.toString();
  switch (viewer.kind) {
    case 'loading':
    case 'error':
      return null;
    case 'guest':
      return `/signup?${query.get('role') === 'mentor' ? 'role=mentor&' : ''}next=${encodeURIComponent(`/onboarding${keep ? `?${keep}` : ''}`)}`;
    case 'member':
      if (viewer.isMentor || viewer.signedUpAsMentor) {
        if (!MENTOR_ONBOARDING_LIVE) return NEW_MENTOR_HOME;
        // Approved: the approved screen once (sign-in's rule), then the dashboard.
        if (viewer.isApprovedMentor)
          return viewer.mentorApprovedSeen === false ? '/mentor-application' : '/dashboard';
        const to = viewer.isMentor ? '/mentor-application' : '/onboarding/mentor';
        return `${to}${keep ? `?${keep}` : ''}`;
      }
      return `/onboarding/mentee${keep ? `?${keep}` : ''}`;
    default:
      return '/explore';
  }
}

export function OnboardingEntry() {
  const viewer = useViewer();
  const query = useSearchParams();
  const router = useRouter();
  const to = onboardingDestination(viewer, new URLSearchParams(query.toString()));
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);
  return (
    <OnboardingFrame>
      {viewer.kind === 'error' ? (
        // Error before empty: a failed /me never leaves a spinner with no way out.
        <main className={styles.state}>
          <EmptyState
            illustration="forms"
            headingLevel={1}
            title={FLOW_COPY.loadErrorTitle}
            description={FLOW_COPY.loadErrorBody}
            actions={
              <Button size="large" onClick={viewer.retry}>
                {MATCH_COPY.retry}
              </Button>
            }
          />
        </main>
      ) : (
        <Waiting text={FLOW_COPY.loading} hidden />
      )}
    </OnboardingFrame>
  );
}
