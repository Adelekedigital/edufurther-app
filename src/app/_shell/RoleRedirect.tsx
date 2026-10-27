'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { useViewer } from '@/lib/api/data/viewer';
import { routeRole, wrongRoleHome } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';
import { useReplaceTo } from './useReplaceTo';
import styles from './RoleRedirect.module.css';

/**
 * A page for the other role never shows (owner, 2026-10-20): it replaces the
 * URL with the viewer's own home (`wrongRoleHome`, ROUTE_ROLES). Returns where
 * it is going, or null; nothing redirects while /me loads.
 */
export function useRoleRedirect(viewer: Viewer): string | null {
  const to = wrongRoleHome(viewer, usePathname());
  useReplaceTo(to);
  return to;
}

/**
 * The one enforcement point: the (app) layout wraps every page in it, and the
 * role pages outside the group (the two onboarding flows) wrap their screen.
 * While redirecting it renders nothing of the page. On a role's page, while
 * /me loads, a neutral skeleton stands in: the role isn't known, so neither
 * role's page may flash. Shared pages and guests render as they are.
 */
export function RoleRedirect({ children }: { children: ReactNode }) {
  const viewer = useViewer();
  const pathname = usePathname();
  const to = useRoleRedirect(viewer);
  if (to) return null;
  if (viewer.kind === 'loading' && pathname && routeRole(pathname)) return <RoleLoading />;
  return children;
}

/**
 * The role isn't known yet: a page-shaped placeholder, nothing either role
 * would read. Also the admin app's while /me loads.
 */
export function RoleLoading() {
  return (
    <div className={styles.loading} role="status" aria-label="Loading" aria-busy="true">
      <Skeleton width="40%" height="32px" />
      <Skeleton width="60%" height="18px" />
      <Skeleton height="160px" radius="md" />
    </div>
  );
}
