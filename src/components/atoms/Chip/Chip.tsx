import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import styles from './Chip.module.css';

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-pressed'> & {
  /** On/off toggle. Announced with aria-pressed; a check glyph shows when on. */
  pressed: boolean;
  /**
   * filter — 32px, square-ish, a check when on (Explore topics).
   * pill   — 28px, fully round, no check (Mentor Profile review filters).
   * choice — the DS Chip itself: 40px, brand face, inset ring, no check
   *          (Session Types topics, stages, goals).
   */
  look?: 'filter' | 'pill' | 'choice';
  children: ReactNode;
};

/**
 * Toggle chip — the Explore topic filter, and (`look="pill"`) the profile's
 * review filters. DS `Chip` is a 40px input/filter chip
 * with a chevron; the design draws this 32px pressed variant, so it is its own
 * atom rather than a prop on that one (see design-divergence.md).
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { pressed, look = 'filter', className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      // In a radiogroup (one choice of several) it's a radio: checked, not pressed.
      aria-pressed={rest.role === 'radio' ? undefined : pressed}
      aria-checked={rest.role === 'radio' ? pressed : undefined}
      className={cx(
        styles.chip,
        look === 'pill' && styles.pill,
        look === 'choice' && styles.choice,
        pressed && styles.on,
        className,
      )}
      {...rest}
    >
      {pressed && look === 'filter' && <Icon name="check" size={14} />}
      {children}
    </button>
  );
});
