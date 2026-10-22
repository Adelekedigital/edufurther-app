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
 * every session card. Its size comes from the line it sits in. Read as one
 * whole string (the design's `cfAria`): `role="img"` so the `aria-label` is
 * announced, never a visible part plus an `.sr-only` tail that can trim itself
 * apart (failure mode #51), as the review stars do.
 */
export function BookingModeLabel({ requiresConfirmation, className }: BookingModeLabelProps) {
  const mode = requiresConfirmation ? 'request' : 'instant';
  const copy = BOOKING_MODE[mode];
  return (
    <span
      role="img"
      aria-label={`${copy.label}: ${copy.detail}`}
      className={cx(styles.label, styles[mode], className)}
    >
      <Icon name={mode === 'instant' ? 'bolt' : 'how_to_reg'} size={14} />
      <span aria-hidden="true">{copy.label}</span>
    </span>
  );
}
