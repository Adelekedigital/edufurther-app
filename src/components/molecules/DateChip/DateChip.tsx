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
 * "Next session"). Assistive tech hears the full date instead ("October 4,
 * 2026"): "Oct" then "4" reads poorly, and the row's time line alone can't say
 * which day a session weeks away falls on.
 */
export function DateChip({ iso, timeZone }: DateChipProps) {
  return (
    <span className={styles.chip}>
      <span aria-hidden="true" className={styles.month}>
        {part(iso, timeZone, { month: 'short' })}
      </span>
      <span aria-hidden="true" className={styles.day}>
        {part(iso, timeZone, { day: 'numeric' })}
      </span>
      <span className="sr-only">
        {part(iso, timeZone, { month: 'long', day: 'numeric', year: 'numeric' })}
      </span>
    </span>
  );
}
