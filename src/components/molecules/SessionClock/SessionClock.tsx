import styles from './SessionClock.module.css';

type SessionClockProps = {
  /** "Starts in" / "In session". */
  label: string;
  /** "08:00", "1:45:00". */
  value: string;
  /** "Join opens in 03:00" / "18 min left". */
  sub: string;
};

/**
 * Session Join.dc.html: the lobby's big countdown.
 *
 * Deliberately **not** a live region, though the design marks it
 * `aria-live="polite"`: it changes every second, and a screen reader would read
 * every one of them. The page announces the moments that matter (the door
 * opening, someone arriving) through its own LiveRegion instead.
 */
export function SessionClock({ label, value, sub }: SessionClockProps) {
  return (
    <div className={styles.clock}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <span className={styles.sub}>{sub}</span>
    </div>
  );
}
