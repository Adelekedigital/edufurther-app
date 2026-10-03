import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { cx } from '@/lib/utils/cx';
import styles from './DeadlinePill.module.css';

type DeadlinePillProps = {
  icon: IconName;
  /** "Respond within 6h" · "Amara has 18h left to confirm". */
  children: string;
  /** Under a day left: the warm ground instead of the grey one. */
  urgent?: boolean;
  className?: string;
};

/**
 * How long a pending request has left, on whichever side is looking
 * (Bookings.dc.html, `waitingStyle=pill`).
 *
 * One pill for both sides: the mentor's "Respond within 6h" and the mentee's
 * "Waiting for Amara to confirm" are the same control with different words, and
 * the design gives them identical padding, radius, size, weight and tones. The
 * wording is the caller's, because only it knows the side.
 */
export function DeadlinePill({ icon, children, urgent, className }: DeadlinePillProps) {
  return (
    <span className={cx(styles.badge, urgent && styles.urgent, className)}>
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}
