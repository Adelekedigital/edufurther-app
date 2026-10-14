import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './ProgressCircle.module.css';

/** The arc's tone. The track stays neutral; only the value arc changes. */
export type ProgressCircleTone = 'primary' | 'success' | 'danger';

type ProgressCircleProps = {
  /** Progress 0–100; clamped and rounded. */
  value: number;
  /** lg ~90px (DS default, show-up rate). md ~64px for denser spots. */
  size?: 'md' | 'lg';
  /** Arc colour. Defaults to the primary action colour. */
  tone?: ProgressCircleTone;
  /** Render the "{pct}%" in the centre. */
  showLabel?: boolean;
  /**
   * What the percentage measures, e.g. "Show-up rate". Required: the rendered
   * value is `${label} ${pct}%` and that is the ring's only accessible name,
   * since the SVG and the centre label are decorative.
   */
  'aria-label': string;
  className?: string;
};

/** box (viewBox + drawn px) and stroke width per size. */
const SIZES = {
  md: { box: 64, stroke: 6 },
  lg: { box: 90, stroke: 8 },
} as const;

/**
 * DS ProgressCircle (Mentor Dashboard v2.dc.html `ProgressCircle`, hint-size
 * 90px,90px): an SVG ring — a neutral track plus a value arc with a rounded
 * cap, from the top, clockwise — with a centred "{pct}%" label. The arc's
 * sweep transitions over --duration-slow, which ours.css drops to 0ms under
 * prefers-reduced-motion. The ring is one image: its aria-label carries the
 * whole fact ("Show-up rate 94%") and the SVG and label are aria-hidden.
 */
export function ProgressCircle({
  value,
  size = 'lg',
  tone = 'primary',
  showLabel = true,
  'aria-label': ariaLabel,
  className,
}: ProgressCircleProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const { box, stroke } = SIZES[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const center = box / 2;
  const style = { width: `${box}px`, height: `${box}px` } as CSSProperties;

  return (
    <div
      className={cx(styles.root, styles[size], className)}
      style={style}
      role="img"
      aria-label={`${ariaLabel} ${pct}%`}
    >
      <svg className={styles.svg} viewBox={`0 0 ${box} ${box}`} aria-hidden="true" focusable="false">
        <circle
          className={styles.track}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className={cx(styles.arc, styles[`arc-${tone}`])}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      {showLabel && (
        <span className={styles.label} aria-hidden="true">
          {pct}%
        </span>
      )}
    </div>
  );
}
