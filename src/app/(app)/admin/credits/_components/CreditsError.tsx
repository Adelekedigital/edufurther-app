import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { CREDITS_STATES } from '@/lib/copy/adminCredits';
import { AdminLoadError } from '../../_components/AdminLoadError';
import styles from './CreditsStates.module.css';

/**
 * Q12: a Credits read that failed, with Try again: the shared admin load
 * error in Credits' words. `framed`: in its own card, where the list was.
 */
export function CreditsError({
  onRetry,
  framed = false,
}: {
  onRetry: () => void;
  framed?: boolean;
}) {
  return (
    <AdminLoadError
      title={CREDITS_STATES.errorTitle}
      body={CREDITS_STATES.errorBody}
      retryLabel={CREDITS_STATES.retry}
      onRetry={onRetry}
      framed={framed}
    />
  );
}

/** Skeleton rows while a list loads (Admin.dc.html `skelRows`). */
export function SkeletonRows({ label, count = 5 }: { label: string; count?: number }) {
  return (
    <div aria-busy="true" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skelRow} aria-hidden>
          <Skeleton width="32px" height="32px" radius="full" />
          <span className={styles.skelText}>
            <Skeleton width="40%" height="12px" />
            <Skeleton width="24%" height="10px" />
          </span>
        </div>
      ))}
    </div>
  );
}
