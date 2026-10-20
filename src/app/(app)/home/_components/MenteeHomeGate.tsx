'use client';

import { useSetupDetour } from '@/app/_shell/useSetupDetour';
import { useViewer } from '@/lib/api/data/viewer';
import { MenteeHomeScreen } from './MenteeHomeScreen';

/**
 * An account that hasn't finished onboarding has no Home yet: they go to it
 * (the setup lock, lib/utils/access), as the nav's Home already sends them:
 * a mentee to theirs, a mentor sign-up to mentor onboarding. Only once /me
 * says so; while it loads, Home shows its own skeleton.
 */
export function MenteeHomeGate() {
  if (useSetupDetour(useViewer())) return null;
  return <MenteeHomeScreen />;
}
