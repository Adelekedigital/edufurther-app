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
  /** square: the 32px rounded-square row action (Session Types.dc.html rows). */
  shape?: 'round' | 'square';
  /** danger: hover turns red — for a delete that then confirms. */
  tone?: 'default' | 'danger';
};

const ICON_SIZE = { sm: 18, md: 20, lg: 22 } as const;

/**
 * Quiet icon control (search clear, modal close, dismiss; square for row actions).
 * 44px hit area on phones.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 'md', shape = 'round', tone = 'default', className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cx(
        styles.button,
        styles[size],
        shape === 'square' && styles.square,
        tone === 'danger' && styles.danger,
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
    </button>
  );
});
