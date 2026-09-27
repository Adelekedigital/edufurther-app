import styles from './StepBars.module.css';

type StepBarsProps = {
  total: number;
  /** 0-based index of the current step; bars up to and including it fill. */
  current: number;
  /** e.g. "Step 2 of 3". The bars themselves are decorative. */
  label: string;
};

/** Segmented progress across the top of a multi-step flow. */
export function StepBars({ total, current, label }: StepBarsProps) {
  return (
    <div
      className={styles.bars}
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={Math.min(current + 1, total)}
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i <= current ? styles.on : styles.off} />
      ))}
    </div>
  );
}
