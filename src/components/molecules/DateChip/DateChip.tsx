import styles from './DateChip.module.css';

type DateChipProps = {
  /** The moment whose day the chip shows. */
  iso: string;
  /** The viewer's zone: the month and day read in it. */
  timeZone: string;
};

const part = (iso: string, timeZone: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { ...opts, timeZone }).format(new Date(iso));

/**
 * The month-over-day tile beside a session (Mentor and Mentee Dashboard v2
 * "Next session"). Decorative: the row it sits in says the date in words, so
 * the chip is hidden from assistive tech.
 */
export function DateChip({ iso, timeZone }: DateChipProps) {
  return (
    <span className={styles.chip} aria-hidden="true">
      <span className={styles.month}>{part(iso, timeZone, { month: 'short' })}</span>
      <span className={styles.day}>{part(iso, timeZone, { day: 'numeric' })}</span>
    </span>
  );
}
