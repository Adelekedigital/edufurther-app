import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import styles from './Chip.module.css';

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-pressed'> & {
  /** On/off toggle. Announced with aria-pressed; a check glyph shows when on. */
  pressed: boolean;
  children: ReactNode;
};

/**
 * Toggle chip — the Explore topic filter. DS `Chip` is a 40px input/filter chip
 * with a chevron; the design draws this 32px pressed variant, so it is its own
 * atom rather than a prop on that one (see design-divergence.md).
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { pressed, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-pressed={pressed}
      className={cx(styles.chip, pressed && styles.on, className)}
      {...rest}
    >
      {pressed && <Icon name="check" size={14} />}
      {children}
    </button>
  );
});
