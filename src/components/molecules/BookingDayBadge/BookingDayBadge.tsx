import { dayKey } from '@/lib/utils/slots';
import { formatDay } from '@/lib/utils/format';
import styles from './BookingDayBadge.module.css';

type BookingDayBadgeProps = {
  /** UTC instant of the session's start. */
  startsAt: string;
  /** The viewer's zone: the badge shows *their* day, not the stored one. */
  timeZone: string;
};

/**
 * The day block at the head of a booking row — "TUE" over "6" (Bookings.dc.html).
 *
 * Decorative: the row's heading and time line already say the full date, so a
 * screen reader hearing "TUE 6" as well would read the same session twice.
 */
export function BookingDayBadge({ startsAt, timeZone }: BookingDayBadgeProps) {
  const { weekday, date } = formatDay(dayKey(startsAt, timeZone));
  // formatDay gives "Sep 28"; the badge wants the number alone under the weekday.
  const day = date.split(' ')[1] ?? date;
  return (
    <span aria-hidden="true" className={styles.badge}>
      <span className={styles.weekday}>{weekday}</span>
      <span className={styles.day}>{day}</span>
    </span>
  );
}
