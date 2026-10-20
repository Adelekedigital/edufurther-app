import type { ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './FrozenGroup.module.css';

/**
 * Controls that hold still while something is reviewed (the mentor
 * application freeze). Frozen, a disabled fieldset dims them and takes them
 * out of the tab order; otherwise a plain div with the caller's class, so the
 * layout is the same either way.
 */
export function FrozenGroup({
  frozen,
  className,
  children,
}: {
  frozen: boolean;
  className?: string;
  children: ReactNode;
}) {
  return frozen ? (
    <fieldset disabled className={cx(styles.frozen, className)}>
      {children}
    </fieldset>
  ) : (
    <div className={className}>{children}</div>
  );
}
