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
};

/** Inline status notice inside a page region. Announced politely. */
export function Notice({ tone, icon, title, children, onDismiss }: NoticeProps) {
  return (
    <div role="status" className={cx(styles.notice, styles[tone])}>
      {icon && <Icon name={icon} size={20} className={styles.icon} />}
      <p className={styles.text}>
        {title && <strong>{title}</strong>} {children}
      </p>
      {onDismiss && <IconButton icon="close" size="sm" aria-label="Dismiss" onClick={onDismiss} />}
    </div>
  );
}
