import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Badge.module.css';

type BadgeProps = (
  | {
      /** filled: solid ground, white text. accent: tinted ground. */
      type?: 'filled' | 'accent';
      color?: 'primary' | 'green' | 'red' | 'neutral';
    }
  | {
      /**
       * Orange, accent only: the Featured badge (Session Types PRD, list). The
       * ramp stays banned elsewhere in product UI (project-conventions).
       */
      type: 'accent';
      color: 'orange';
    }
  | {
      /**
       * Amber, accent only: "Needs attention" (Mentor Dashboard v2.dc.html, the
       * session-quality fair tier). The design draws no filled amber badge.
       */
      type: 'accent';
      color: 'warning';
    }
) & {
  /** sm 10px caption / md 12px. */
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
};

/** DS Badge (_ds_bundle.js components/core/Badge.jsx). A non-interactive label. */
export function Badge({
  type = 'filled',
  color = 'primary',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[size], styles[`${color}-${type}`], className)}>
      {children}
    </span>
  );
}
