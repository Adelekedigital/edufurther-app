import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import { Icon } from '../Icon/Icon';
import styles from './Select.module.css';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  /** Width of the control; the design draws 160px (rules) and 240px (overrides). */
  width?: number;
  invalid?: boolean;
};

/**
 * Native select with the design's chevron (Session Types.dc.html rule rows).
 * Native on purpose: the OS picker is the accessible one on phones.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, width, invalid, className, ...rest },
  ref,
) {
  return (
    <span className={cx(styles.wrap, className)} style={width ? { width } : undefined}>
      <select ref={ref} className={styles.select} {...rest} aria-invalid={invalid || undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="expand_more" size={18} className={styles.chevron} />
    </span>
  );
});
