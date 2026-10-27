import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import type { CreditRules as Rules } from '@/lib/api/data/adminCredits';
import { RULES_COPY } from '@/lib/copy/adminCredits';
import { CreditsError } from './CreditsError';
import styles from './CreditRules.module.css';

type CreditRulesProps = {
  rules: Rules | null;
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
};

/**
 * The credit rules, read-only (founder, 2026-10-26): the server's values where
 * the design draws steppers, no quiet-month row, notice or save bar.
 */
export function CreditRules({ rules, status, onRetry }: CreditRulesProps) {
  if (status === 'error') {
    return (
      <div className={styles.wrap}>
        <CreditsError onRetry={onRetry} framed />
      </div>
    );
  }
  const rows = [
    { ...RULES_COPY.starter, value: rules?.starter },
    { ...RULES_COPY.monthly, value: rules?.monthly },
  ];
  return (
    <div className={styles.wrap}>
      <div
        className={styles.card}
        aria-busy={status === 'loading' || undefined}
        aria-label={status === 'loading' ? RULES_COPY.loading : undefined}
        role={status === 'loading' ? 'status' : undefined}
      >
        <dl className={styles.rules}>
          {rows.map((r) => (
            <div key={r.label} className={styles.rule}>
              <dt className={styles.ruleText}>
                <span className={styles.label}>{r.label}</span>
                <span className={styles.help}>{r.help}</span>
              </dt>
              <dd className={styles.value}>
                {r.value === undefined ? <Skeleton width="24px" height="20px" /> : r.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className={styles.unlock}>
          <span className={styles.label}>{RULES_COPY.unlockTitle}</span>
          <span className={styles.help}>{RULES_COPY.unlock}</span>
        </div>
      </div>
    </div>
  );
}
