import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import styles from './BookingFlow.module.css';
import { windowLabel } from '@/lib/utils/windowLabel';

// The flow's non-content states: the whole flow's (the offerings, the request
// once sent) and the time step's (its slots).

export function FlowSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.loading} aria-busy>
      <span className="sr-only" role="status">
        {label}
      </span>
      <Skeleton height="72px" radius="lg" />
      <Skeleton height="36px" radius="md" />
      <Skeleton height="36px" radius="md" width="60%" />
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      illustration="forms"
      headingLevel={3}
      size={100}
      title="We couldn’t load available times"
      description="Something went wrong on our side. Try again in a moment."
      actions={
        <Button size="large" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}

/** PROVISIONAL (design request #38): the card's "No open times at the moment". */
export function NoTimes({
  firstName,
  manyTypes,
  windowDays,
}: {
  firstName: string;
  manyTypes: boolean;
  /**
   * The session's booking window. With it, the mentor may well have hours, just
   * none free inside it (owner 2026-11-21): say so, never "hasn't opened any".
   * Without it there's no session to book at all.
   */
  windowDays?: number;
}) {
  const span =
    windowDays === undefined ? null : windowDays === 7 ? '7 days' : windowLabel(windowDays);
  return (
    <EmptyState
      illustration="calendar"
      headingLevel={3}
      size={100}
      title={span ? `No open times in the next ${span}` : 'No open times at the moment'}
      description={
        manyTypes
          ? 'Try another session type, or check back soon.'
          : span
            ? 'Check back soon.'
            : `${firstName} hasn’t opened any times yet. Check back soon.`
      }
    />
  );
}
