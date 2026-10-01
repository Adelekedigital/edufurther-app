import { Switch } from '@/components/atoms/Switch/Switch';
import { cx } from '@/lib/utils/cx';
import styles from './StatusPill.module.css';

type StatusPillProps = {
  tone: 'available' | 'busy';
  /** "Available", "Busy". */
  label: string;
  /** "Open for new bookings", "Back Sat, Oct 3". */
  hint: string;
  /** With a handler, the pill carries the design's switch (on = available). */
  onChange?: (available: boolean) => void;
};

/** Calendar v2 header status: a dot, label and hint, and the availability switch. */
export function StatusPill({ tone, label, hint, onChange }: StatusPillProps) {
  return (
    <div className={cx(styles.pill, styles[tone])}>
      <span aria-hidden className={styles.dot} />
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.hint}>{hint}</span>
      </div>
      {onChange && (
        <Switch
          checked={tone === 'available'}
          onChange={onChange}
          aria-label="Available for new bookings"
        />
      )}
    </div>
  );
}
