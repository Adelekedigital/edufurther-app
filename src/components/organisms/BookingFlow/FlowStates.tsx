import { Button } from '@/components/atoms/Button/Button';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import styles from './BookingFlow.module.css';

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
export function NoTimes({ firstName, manyTypes }: { firstName: string; manyTypes: boolean }) {
  return (
    <EmptyState
      illustration="calendar"
      headingLevel={3}
      size={100}
      title="No open times at the moment"
      description={
        manyTypes
          ? 'Try another session type, or check back soon.'
          : `${firstName} hasn’t opened any times yet. Check back soon.`
      }
    />
  );
}

export function RequestSent({ picked, firstName }: { picked: string; firstName: string }) {
  return (
    <div className={styles.done}>
      <EmptyState
        illustration="calendar"
        headingLevel={3}
        size={120}
        title="Request sent"
        description={`${picked} is on hold. You’ll get an email when ${firstName} replies.`}
      />
    </div>
  );
}
