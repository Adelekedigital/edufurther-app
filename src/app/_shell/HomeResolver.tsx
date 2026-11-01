'use client';

import { Button } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { useViewer } from '@/lib/api/data/viewer';
import { HOME_RESOLVE_COPY } from '@/lib/copy/home';
import { memberHome } from '@/lib/utils/access';
import type { Viewer } from '@/types/mentor';
import { RoleLoading } from './RoleRedirect';
import { useReplaceTo } from './useReplaceTo';
import styles from './HomeResolver.module.css';

/** Where the browser sends a viewer `/` couldn't place; null while /me loads or failed. */
export function resolvedHome(viewer: Viewer): string | null {
  switch (viewer.kind) {
    case 'member':
      return memberHome(viewer);
    case 'guest':
    case 'unlinked':
    case 'accountExists':
      return '/explore';
    default:
      return null;
  }
}

/**
 * `/` when the server ran out of time (or the backend failed) before it knew
 * who is signed in (RESOLVE_IN_BROWSER): the browser asks /me itself, showing
 * a neutral placeholder meanwhile, so neither role's page flashes and a mentor
 * never lands on Explore by accident (owner, 2026-11-01).
 */
export function HomeResolver() {
  const viewer = useViewer();
  const to = resolvedHome(viewer);
  useReplaceTo(to);
  // Error before anything else: a failed /me must not leave a skeleton forever.
  if (viewer.kind === 'error') {
    return (
      <main className={styles.state}>
        <EmptyState
          illustration="forms"
          headingLevel={1}
          title={HOME_RESOLVE_COPY.errorTitle}
          description={HOME_RESOLVE_COPY.errorBody}
          actions={
            <Button size="large" onClick={viewer.retry} busy={viewer.retrying}>
              {HOME_RESOLVE_COPY.retry}
            </Button>
          }
        />
      </main>
    );
  }
  return (
    <main>
      <RoleLoading />
    </main>
  );
}
