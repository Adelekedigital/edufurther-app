'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { keepMockViewer, useViewer } from '@/lib/api/data/viewer';
import { wrongRoleHome } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';

/**
 * A page for the other role never shows (owner, 2026-10-20): it replaces the
 * URL with the viewer's own home (`wrongRoleHome`, ROUTE_ROLES). Returns where
 * it is going, or null; nothing redirects while /me loads.
 */
export function useRoleRedirect(viewer: Viewer): string | null {
  const router = useRouter();
  const to = wrongRoleHome(viewer, usePathname());
  useEffect(() => {
    if (to) router.replace(keepMockViewer(to));
  }, [to, router]);
  return to;
}

/**
 * The one enforcement point: the (app) layout wraps every page in it, and the
 * role pages outside the group (the two onboarding flows) wrap their screen.
 * While redirecting it renders nothing of the page, so it never flashes.
 */
export function RoleRedirect({ children }: { children: ReactNode }) {
  return useRoleRedirect(useViewer()) ? null : children;
}
