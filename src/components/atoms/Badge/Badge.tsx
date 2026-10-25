import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/iconNames';
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
) & {
  /** sm 10px caption / md 12px. */
  size?: 'sm' | 'md';
  /** A leading glyph, decorative (InviteModal.dc.html's `check_circle` badge: 14px on md). */
  icon?: IconName;
  children: ReactNode;
  className?: string;
};

/** DS Badge (_ds_bundle.js components/core/Badge.jsx). A non-interactive label. */
export function Badge({
  type = 'filled',
  color = 'primary',
  size = 'md',
  icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[size], styles[`${color}-${type}`], className)}>
      {icon && <Icon name={icon} size={size === 'md' ? 14 : 12} />}
      {children}
    </span>
  );
}
