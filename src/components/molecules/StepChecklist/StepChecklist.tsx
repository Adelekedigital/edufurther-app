import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import styles from './StepChecklist.module.css';

export type ChecklistStep = {
  key: string;
  label: string;
  done: boolean;
  /** On the right, e.g. what the step pays ("2 a month"). */
  value?: string;
};

type StepChecklistProps = {
  steps: readonly ChecklistStep[];
  /** The list's name ("How to get 3 free sessions every month"). */
  label: string;
  /**
   * Read after a done step's label, e.g. "done". Omit when the label's own
   * tense already says it ("You attended your first session").
   */
  doneLabel?: string;
};

/**
 * Steps with a tick ring each, done ones green (InviteModal.dc.html steps;
 * the credits card's "Your monthly credits"). One list for both, so a ticked
 * step looks the same wherever it appears. The ring is decorative.
 */
export function StepChecklist({ steps, label, doneLabel }: StepChecklistProps) {
  return (
    <ul className={styles.steps} aria-label={label}>
      {steps.map((s) => (
        <li key={s.key} className={cx(styles.step, s.done && styles.done)}>
          <span className={styles.ring} aria-hidden>
            {s.done && <Icon name="check" size={16} />}
          </span>
          <span className={styles.label}>
            {s.label}
            {s.done && doneLabel && <span className="sr-only">, {doneLabel}</span>}
          </span>
          {s.value && <span className={styles.value}>{s.value}</span>}
        </li>
      ))}
    </ul>
  );
}
