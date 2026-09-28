import type { CSSProperties } from 'react';
import styles from './RatingBar.module.css';

type RatingBarProps = {
  label: string;
  /** Whole-number percentage, 0–100. */
  percent: number;
};

/**
 * Mentor Profile.dc.html reviews summary: one attribute's label and percentage
 * over a 6px bar. The text carries the value; the bar is decorative.
 */
export function RatingBar({ label, percent }: RatingBarProps) {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className={styles.row}>
      <span className={styles.text}>
        {label}
        <strong className={styles.value}>{p}%</strong>
      </span>
      <span className={styles.track} aria-hidden>
        <span className={styles.fill} style={{ '--fill': `${p}%` } as CSSProperties} />
      </span>
    </div>
  );
}
