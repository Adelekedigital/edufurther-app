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
  /**
   * pill: fully round, 2px 8px, a 14px glyph (Messages.dc.html "Next: {when}").
   * count: a 20px round number pill, 11px (Messages.dc.html unread count).
   */
  shape?: 'tag' | 'pill' | 'count';
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
  shape = 'tag',
  icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cx(
        styles.badge,
        styles[size],
        shape !== 'tag' && styles[shape],
        styles[`${color}-${type}`],
        className,
      )}
    >
      {icon && <Icon name={icon} size={size === 'md' || shape === 'pill' ? 14 : 12} />}
      {children}
    </span>
  );
}
