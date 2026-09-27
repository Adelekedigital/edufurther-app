import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils/cx';
import type { IconName } from './iconNames';
import styles from './Icon.module.css';

type IconProps = {
  name: IconName;
  /** px. DS sizes: 14–16 inline, 18 in chips, 20 in buttons, 24 standalone. */
  size?: 12 | 14 | 16 | 18 | 20 | 22 | 24 | 28;
  filled?: boolean;
  /**
   * Omit for a decorative icon (the default: hidden from assistive tech).
   * Pass a label only when the icon alone carries meaning.
   */
  label?: string;
  className?: string;
};

export function Icon({ name, size = 20, filled, label, className }: IconProps) {
  const style = { '--icon-size': `${size}px` } as CSSProperties;
  return (
    <span
      className={cx(styles.icon, filled && styles.filled, className)}
      style={style}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {name}
    </span>
  );
}
