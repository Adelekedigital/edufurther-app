import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './WizardSteps.module.css';

type WizardStepsProps = {
  steps: string[];
  /** 1-based step on screen. */
  current: number;
  /** Furthest step reached, 1-based. Steps past it are locked. */
  reached: number;
  onSelect: (step: number) => void;
  /** Names the list, e.g. "Create a session type". */
  label: string;
};

/**
 * Labelled step list with a bar per step (Session Types.dc.html `data-ef="steps"`).
 * Not StepBars: that one is bars only. Reached steps are buttons back to that
 * step; steps past the furthest reached are disabled, so a deep link can't skip
 * ahead of what's been filled in.
 */
export function WizardSteps({ steps, current, reached, onSelect, label }: WizardStepsProps) {
  return (
    <nav aria-label={label}>
      <ol className={styles.list}>
        {steps.map((name, i) => {
          const n = i + 1;
          const isCurrent = n === current;
          const done = !isCurrent && n <= reached;
          // The step on screen is never locked, even if a caller passes one past `reached`.
          const locked = n > reached && !isCurrent;
          const state = isCurrent ? 'current' : done ? 'done' : 'upcoming';
          return (
            <li key={name} className={cx(styles.step, styles[state])}>
              <span className={styles.bar} aria-hidden />
              <button
                type="button"
                className={styles.button}
                disabled={locked}
                aria-current={isCurrent ? 'step' : undefined}
                // aria-label, not an sr-only span: Chrome reads that span as a block ("Core details , done").
                aria-label={done ? `${name}, done` : undefined}
                onClick={() => onSelect(n)}
              >
                <span className={styles.dot} aria-hidden>
                  {done ? <Icon name="check" size={14} /> : n}
                </span>
                {name}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
