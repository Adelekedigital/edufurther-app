import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { IconButton } from '@/components/atoms/IconButton/IconButton';
import styles from './Notice.module.css';

type NoticeProps = {
  /**
   * warning: the DS onboarding callout (Mentee Onboarding v5 `unavailable`). It
   * always shows the DS's trailing `error` icon, so `icon` is ignored.
   * danger: the same DS callout in red (Mentor Onboarding `submitErr`).
   */
  /** subtle: outlined grey, top-aligned (Mentor Settings.dc.html review freeze banner). */
  tone: 'neutral' | 'subtle' | 'info' | 'warning' | 'danger';
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
  /** DS `show-icon`: false drops the warning / danger tones' trailing icon (SecuritySettings delete warning). */
  showIcon?: boolean;
};

/** Inline status notice inside a page region. Announced politely; a danger one interrupts. */
export function Notice({
  tone,
  icon,
  title,
  children,
  onDismiss,
  id,
  live = true,
  showIcon = true,
}: NoticeProps) {
  const ds = tone === 'warning' || tone === 'danger';
  return (
    <div
      id={id}
      role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}
      className={cx(styles.notice, ds && styles.ds, styles[tone])}
    >
      {icon && !ds && <Icon name={icon} size={20} className={styles.icon} />}
      <p className={styles.text}>
        {title && <strong>{title}</strong>} {children}
      </p>
      {ds && showIcon && <Icon name="error" size={24} className={styles.icon} />}
      {onDismiss && <IconButton icon="close" size="sm" aria-label="Dismiss" onClick={onDismiss} />}
    </div>
  );
}
