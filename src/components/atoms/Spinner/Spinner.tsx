import styles from './Spinner.module.css';

type SpinnerProps = {
  /** px; the design draws 32 on a waiting page, 48 by default. */
  size?: number;
};

/**
 * DS Spinner (design-system/components/feedback/Spinner): a quarter arc in
 * the action colour turning over an ink-100 ring, stroke 13% of the size (at
 * least 4px). Decorative: the region around it says what is happening.
 */
export function Spinner({ size = 48 }: SpinnerProps) {
  const t = Math.max(4, Math.round(size * 0.13));
  const r = (size - t) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      aria-hidden
      className={styles.spinner}
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
