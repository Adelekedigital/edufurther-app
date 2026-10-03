import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import { formatRespondIn, isRespondUrgent } from '@/lib/utils/bookings';
import styles from './RespondBadge.module.css';

type RespondBadgeProps = {
  /** When the request stops waiting (ISO instant). */
  deadline: string;
  /** Injected in tests and stories; the clock otherwise. */
  now?: Date;
  className?: string;
};

/**
 * "Respond within 6h" on a pending request (Bookings.dc.html). Warm under a
 * day, grey above it.
 *
 * A request whose deadline has passed gets no badge: `isLapsed` has already
 * taken the actions away, and "Respond within 1 min" ticking at a dead row
 * would be a lie with a countdown on it.
 */
export function RespondBadge({ deadline, now = new Date(), className }: RespondBadgeProps) {
  if (new Date(deadline).getTime() <= now.getTime()) return null;
  const urgent = isRespondUrgent(deadline, now);
  return (
    <span className={cx(styles.badge, urgent && styles.urgent, className)}>
      <Icon name="timer" size={14} />
      Respond within {formatRespondIn(deadline, now)}
    </span>
  );
}
