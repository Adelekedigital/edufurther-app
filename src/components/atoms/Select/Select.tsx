import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import styles from './Select.module.css';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  /** Width of the control; the design draws 160px (rules) and 240px (overrides). */
  width?: number;
  invalid?: boolean;
  /**
   * compact: 36px, tighter padding and a 16px chevron (TimeSlots.dc.html `compact`).
   * xl: 48px flow-form field with a 24px chevron (Mentee Onboarding v5.dc.html).
   */
  density?: 'default' | 'compact' | 'xl';
  /**
   * sm: use in a form, beside text inputs: 14px like them (Mentor Settings.dc.html
   * profile selects), grey while nothing is picked. Default xs: the 12px rule
   * rows (Booking rules, Session Types, TimeSlots).
   */
  text?: 'xs' | 'sm';
};

/**
 * Native select with the design's chevron (Session Types.dc.html rule rows).
 * Native on purpose: the OS picker is the accessible one on phones.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, width, invalid, density = 'default', text = 'xs', className, ...rest },
  ref,
) {
  return (
    <span
      className={cx(
        styles.wrap,
        density !== 'default' && styles[density],
        text === 'sm' && styles.sm,
        text === 'sm' && rest.value === '' && styles.empty,
        className,
      )}
      style={width ? { width } : undefined}
    >
      <select
        ref={ref}
        className={styles.select}
        // Compact keeps its width on phones too (TimeSlots.dc.html: the select's own width).
        style={density === 'compact' && width ? { width } : undefined}
        {...rest}
        aria-invalid={invalid || undefined}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        size={density === 'compact' ? 16 : density === 'xl' ? 24 : 18}
        className={styles.chevron}
      />
    </span>
  );
});
