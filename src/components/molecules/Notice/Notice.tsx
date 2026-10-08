import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import styles from './Notice.module.css';

type NoticeProps = {
  tone: 'neutral' | 'info';
  /** Omit for a plain tip (Session Types' "Every extra question lowers bookings"). */
  icon?: IconName;
  /** Bold lead-in, e.g. "You're offline." */
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  /** So a control the notice is about can point at it with aria-describedby. */
  id?: string;
  /**
   * False when the page says it through its own always-present LiveRegion: a
   * region inserted with its text already in it is often skipped, and two
   * regions saying one thing read it twice.
   */
  live?: boolean;
};

/** Inline status notice inside a page region. Announced politely. */
export function Notice({ tone, icon, title, children, onDismiss, id, live = true }: NoticeProps) {
  return (
    <div id={id} role={live ? 'status' : undefined} className={cx(styles.notice, styles[tone])}>
      {icon && <Icon name={icon} size={20} className={styles.icon} />}
      <p className={styles.text}>
        {title && <strong>{title}</strong>} {children}
      </p>
      {onDismiss && <IconButton icon="close" size="sm" aria-label="Dismiss" onClick={onDismiss} />}
    </div>
  );
}
