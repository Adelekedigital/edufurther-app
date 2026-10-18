import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './NextSteps.module.css';

export type NextStep = { icon: IconName; title: string; body: string };

type NextStepsProps = { steps: readonly NextStep[] };

/**
 * What happens after applying, in order (Approved.dc.html `reviewSteps`): the
 * in-review page and mentor onboarding's "Application sent" share it.
 */
export function NextSteps({ steps }: NextStepsProps) {
  return (
    <ol className={styles.list}>
      {steps.map((s) => (
        <li key={s.title} className={styles.step}>
          <span className={styles.badge}>
            <Icon name={s.icon} size={18} />
          </span>
          <span className={styles.text}>
            <span className={styles.title}>{s.title}</span>
            <span className={styles.body}>{s.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
