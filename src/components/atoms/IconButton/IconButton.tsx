import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/iconNames';
import styles from './IconButton.module.css';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconName;
  /** Required: an icon-only control has no visible text to name it. */
  'aria-label': string;
  /** lg — 44px at every width, darker glyph (the phone sheet header). */
  size?: 'sm' | 'md' | 'lg';
};

const ICON_SIZE = { sm: 18, md: 20, lg: 22 } as const;

/** Round, quiet icon control (search clear, modal close, dismiss). 44px hit area on phones. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 'md', className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cx(styles.button, styles[size], className)}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
    </button>
  );
});
