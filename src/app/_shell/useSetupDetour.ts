'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useViewer } from '@/lib/api/data/viewer';
import { accessFor, inSetup } from '@/lib/utils/access';

/**
 * A home page (/home, /dashboard) opened by an account in the setup lock: it
 * has no home yet, so it goes to its own onboarding (lib/utils/access), as
 * the nav's Home already does. Returns where it is going, or null; the page
 * renders nothing of its own meanwhile. While /me loads, null (no lock).
 */
export function useSetupDetour(): string | null {
  const viewer = useViewer();
  const router = useRouter();
  const access = accessFor(viewer);
  const to = inSetup(access) ? access.homeHref : null;
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);
  return to;
}
