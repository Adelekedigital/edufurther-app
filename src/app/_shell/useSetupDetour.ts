'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { accessFor, inSetup } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';

/**
 * A page an account in the setup lock can't use yet (/home, /dashboard, its
 * own profile): it goes to its own onboarding (lib/utils/access), as the
 * nav's Home already does. Returns where it is going, or null; the page
 * renders nothing of its own meanwhile. While /me loads, null (no lock).
 * `when` false (e.g. not the owner) never detours.
 */
export function useSetupDetour(viewer: Viewer, when = true): string | null {
  const router = useRouter();
  const access = accessFor(viewer);
  const to = when && inSetup(access) ? access.homeHref : null;
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);
  return to;
}
