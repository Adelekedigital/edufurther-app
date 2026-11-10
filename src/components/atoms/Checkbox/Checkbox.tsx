import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Checkbox.module.css';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** The box's px: 18 in dense rows (Admin Mentors, Admin Analytics), 20 in forms. */
  size?: 18 | 20;
  /**
   * self: the box draws the focus ring (default). parent: the label around it
   * draws one with `:has(:focus-visible)` (EducationFields' card), so the box
   * draws none and the ring isn't doubled.
   */
  focusRing?: 'self' | 'parent';
};

/**
 * A native checkbox in the DS blue (`accent-color`), as every .dc.html draws
 * it. Put it in a `<label>` with its text, or name it with `aria-label`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { size = 20, focusRing = 'self', className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cx(
        styles.box,
        size === 18 && styles.s18,
        focusRing === 'parent' && styles.parentRing,
        className,
      )}
      {...rest}
    />
  );
});
