import { cx } from '@/lib/utils/cx';
import styles from './SessionStatusPill.module.css';

export type SessionStatusTone = 'blue' | 'green' | 'neutral' | 'red';

type SessionStatusPillProps = {
  tone: SessionStatusTone;
  /** "Upcoming", "Starting soon", "In progress". */
  label: string;
  /** The pulsing dot: the call is running now. */
  live?: boolean;
};

/** Session Join.dc.html: the uppercase status pill over the session's title. */
export function SessionStatusPill({ tone, label, live }: SessionStatusPillProps) {
  return (
    <span className={cx(styles.pill, styles[tone])}>
      {live && <span aria-hidden className={styles.dot} />}
      {label}
    </span>
  );
}
