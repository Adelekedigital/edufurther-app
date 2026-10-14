import { cx } from '@/lib/utils/cx';
import styles from './ProgressBar.module.css';

type ProgressBarProps = {
  /** Progress 0–100; clamped and rounded. */
  value: number;
  /** sm 8px track / lg 12px (DS default). */
  size?: 'sm' | 'lg';
  /** Show a "{pct}%" label to the right. */
  showLabel?: boolean;
  /** Accessible name for the bar, e.g. "Account setup progress". */
  'aria-label'?: string;
  className?: string;
};

/**
 * DS ProgressBar (_ds_bundle.js feedback/ProgressBar.jsx): a track + fill with
 * an optional "{pct}%" label. The width transition uses --duration-slow, which
 * ours.css drops to 0ms under prefers-reduced-motion. A progressbar needs an
 * accessible name, so pass aria-label when no nearby text already labels it.
 */
export function ProgressBar({
  value,
  size = 'lg',
  showLabel = false,
  className,
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx(styles.root, className)}>
      <div
        className={cx(styles.track, styles[size])}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className={styles.label}>{pct}%</span>}
    </div>
  );
}
