'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useViewer } from '@/lib/api/data/viewer';
import { accessFor } from '@/lib/utils/access';
import { MenteeHomeScreen } from './MenteeHomeScreen';

/**
 * A mentee who hasn't finished onboarding has no Home yet: they go to it
 * (the setup lock, lib/utils/access), as the nav's Home already sends them.
 * Only once /me says so; while it loads, Home shows its own skeleton.
 */
export function MenteeHomeGate() {
  const viewer = useViewer();
  const router = useRouter();
  const access = accessFor(viewer);
  const to = access.state === 'menteeSetup' ? access.homeHref : null;
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);
  if (to) return null;
  return <MenteeHomeScreen />;
}
