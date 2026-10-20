import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './PrefixedInput.module.css';

type PrefixedInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Fixed text before what's typed: "x.com/", "https://". Not part of the value. */
  prefix: string;
  invalid?: boolean;
};

/**
 * A text field with a fixed prefix in its own grey box (Mentor Settings.dc.html
 * social link field). Needs a label from its caller. The prefix is hidden from
 * assistive tech: the label says what to type ("X handle").
 */
export const PrefixedInput = forwardRef<HTMLInputElement, PrefixedInputProps>(
  function PrefixedInput({ prefix, invalid, className, ...rest }, ref) {
    return (
      <div className={cx(styles.box, invalid && styles.invalid, className)}>
        <span className={styles.prefix} aria-hidden>
          {prefix}
        </span>
        <input ref={ref} className={styles.input} {...rest} aria-invalid={invalid || undefined} />
      </div>
    );
  },
);
