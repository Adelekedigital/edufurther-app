import type { ReactNode } from 'react';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { ANALYTICS_STATES } from '@/lib/copy/adminAnalytics';
import { AdminLoadError } from '../../_components/AdminLoadError';
import styles from './TabState.module.css';

/**
 * One tab's four states (PRD 31 States, per tab): loading, error, empty,
 * then its content. Error comes before empty; data already loaded wins over
 * a background refetch that failed (`viewStatus`).
 */
export function TabState({
  status,
  empty,
  onRetry,
  retrying,
  children,
}: {
  status: 'loading' | 'error' | 'ready';
  /** Nothing happened in the window. */
  empty: boolean;
  onRetry: () => void;
  retrying: boolean;
  children: () => ReactNode;
}) {
  if (status === 'loading') {
    return (
      <div className={styles.loading} aria-busy="true" aria-label={ANALYTICS_STATES.loading} role="status">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height="140px" radius="xl" />
        ))}
      </div>
    );
  }
  if (status === 'error') {
    return (
      <AdminLoadError
        framed
        illustration="dashboard"
        headingLevel={2}
        title={ANALYTICS_STATES.errorTitle}
        body={ANALYTICS_STATES.errorBody}
        retryLabel={ANALYTICS_STATES.retry}
        onRetry={onRetry}
        retrying={retrying}
      />
    );
  }
  if (empty) {
    return (
      <div className={styles.empty}>
        <EmptyState
          illustration="dashboard"
          size={120}
          headingLevel={2}
          title={ANALYTICS_STATES.emptyTitle}
          description={ANALYTICS_STATES.emptyBody}
        />
      </div>
    );
  }
  return <>{children()}</>;
}
