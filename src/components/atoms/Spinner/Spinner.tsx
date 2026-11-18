import { cx } from '@/lib/utils/cx';
import styles from './Spinner.module.css';

type SpinnerProps = {
  /** px; the design draws 32 on a waiting page, 48 by default. */
  size?: number;
  /**
   * current: drawn in the text colour around it (a busy Button or IconButton),
   * so it reads on every variant's ground. Default: the DS action blue on ink-100.
   */
  tone?: 'action' | 'current';
};

/**
 * DS Spinner (design-system/components/feedback/Spinner): a quarter arc in
 * the action colour turning over an ink-100 ring, stroke 13% of the size (at
 * least 4px). Decorative: the region around it says what is happening.
 */
export function Spinner({ size = 48, tone = 'action' }: SpinnerProps) {
  const t = Math.max(4, Math.round(size * 0.13));
  const r = (size - t) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      aria-hidden
      className={cx(styles.spinner, tone === 'current' && styles.current)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle className={styles.track} cx={size / 2} cy={size / 2} r={r} strokeWidth={t} />
      <circle
        className={styles.arc}
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={t}
        strokeDasharray={`${c * 0.25} ${c}`}
      />
    </svg>
  );
}
