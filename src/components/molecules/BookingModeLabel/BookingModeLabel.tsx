import { Icon } from '@/components/atoms/Icon/Icon';
import { BOOKING_MODE } from '@/lib/copy/profile';
import { cx } from '@/lib/utils/cx';
import styles from './BookingModeLabel.module.css';

type BookingModeLabelProps = {
  /** Booking it waits for the mentor's approval (false: confirmed at once). */
  requiresConfirmation: boolean;
  className?: string;
};

/**
 * "Request to book" / "Instant booking" (Mentor Profile.dc.html `cfLabel`), on
 * every session card. Its size comes from the line it sits in. The meaning is
 * visually hidden text, not the design's `aria-label`: a label on a plain span
 * isn't announced.
 */
export function BookingModeLabel({ requiresConfirmation, className }: BookingModeLabelProps) {
  const mode = requiresConfirmation ? 'request' : 'instant';
  const copy = BOOKING_MODE[mode];
  return (
    <span className={cx(styles.label, styles[mode], className)}>
      <Icon name={mode === 'instant' ? 'bolt' : 'how_to_reg'} size={14} />
      {copy.label}
      <span className="sr-only">: {copy.detail}</span>
    </span>
  );
}
