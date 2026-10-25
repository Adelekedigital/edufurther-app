import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Badge.module.css';

type BadgeProps = {
  /** filled: solid ground, white text. accent: tinted ground. */
  type?: 'filled' | 'accent';
  /**
   * The DS's colours. Orange is for the Featured badge only (Session
   * Types PRD, list); the ramp stays banned elsewhere in product UI.
   */
  color?: 'primary' | 'orange' | 'green' | 'red' | 'neutral';
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
