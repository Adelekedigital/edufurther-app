import { useId, type Ref } from 'react';
import { Switch } from '@/components/atoms/Switch/Switch';
import { cx } from '@/lib/utils/cx';
import styles from './StatusPill.module.css';

type StatusPillProps = {
  tone: 'available' | 'busy';
  /** "Available", "Busy". */
  label: string;
  /** "Mentees can book you", "Reminder Sat, Oct 3". */
  hint: string;
  /** With a handler, the pill carries the design's switch (on = available). */
  onChange?: (available: boolean) => void;
  /** The switch, for focus to land on after a modal it opened closes. */
  switchRef?: Ref<HTMLButtonElement>;
};

/** Calendar v2 header status: a dot, label and hint, and the availability switch. */
export function StatusPill({ tone, label, hint, onChange, switchRef }: StatusPillProps) {
  const textId = useId();
  return (
    <div className={cx(styles.pill, styles[tone])}>
      <span aria-hidden className={styles.dot} />
      <div className={styles.text}>
        <span id={`${textId}-label`} className={styles.label}>
          {label}
        </span>
        <span id={`${textId}-hint`} className={styles.hint}>
          {hint}
        </span>
      </div>
      {onChange && (
        <Switch
          ref={switchRef}
          checked={tone === 'available'}
          onChange={onChange}
          aria-label="Available for new bookings"
          // The switch's name is fixed; its description says the state now ("Busy · Reminder …").
          aria-describedby={`${textId}-label ${textId}-hint`}
        />
      )}
    </div>
  );
}
