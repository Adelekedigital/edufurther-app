import type { ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import styles from './SignInForm.module.css';

/** A red line under a field (Sign In.dc.html): icon, then the words. Announced. */
export function FieldError({
  id,
  icon = 'error',
  children,
}: {
  id?: string;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <p id={id} role="alert" className={styles.error}>
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </p>
  );
}
