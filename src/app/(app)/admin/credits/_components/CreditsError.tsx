import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { Button } from '@/components/atoms/Button/Button';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { CREDITS_STATES } from '@/lib/copy/adminCredits';
import { cx } from '@/lib/utils/cx';
import styles from './CreditsStates.module.css';

/**
 * Q12: a Credits read that failed, with Try again: the Mentors list error
 * (Admin.dc.html `listError`). `framed`: in its own card, where the list was.
 */
export function CreditsError({
  onRetry,
  framed = false,
}: {
  onRetry: () => void;
  framed?: boolean;
}) {
  return (
    <div className={cx(styles.state, framed && styles.framed)}>
      <EmptyState
        illustration="forms"
        size={120}
        headingLevel={3}
        title={CREDITS_STATES.errorTitle}
        description={CREDITS_STATES.errorBody}
      />
      <Button size="medium" variant="secondary-outlined" onClick={onRetry}>
        {CREDITS_STATES.retry}
      </Button>
    </div>
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
