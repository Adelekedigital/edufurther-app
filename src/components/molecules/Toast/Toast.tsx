import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './Toast.module.css';

type ToastProps = {
  /** Shown while true. The live region stays mounted either way. */
  open: boolean;
  icon: IconName;
  title: string;
  /** The line under the title: where they are going next. */
  children?: ReactNode;
};

/**
 * A short outcome before the page moves on (Sign In.dc.html, `afterAuth=toast`):
 * "Welcome back, Amara" / "Opening your Home…". No close button: it lasts as
 * long as the redirect takes.
 *
 * The status region is always in the page and the toast is put inside it,
 * because a region that arrives with its text already in it is often not read
 * out at all.
 */
export function Toast({ open, icon, title, children }: ToastProps) {
  return (
    <div role="status" className={styles.region}>
      {open && (
        <div className={styles.toast}>
          <Icon name={icon} size={20} className={styles.icon} />
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            {children && <span className={styles.body}>{children}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
