import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Radio.module.css';

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Radio — DS `FormControl type="radio" size={20}`: a 1.5px ring, and a dot
 * inset by a quarter of the size when checked. A native input, so a group
 * sharing `name` gets arrow-key movement and one tab stop from the browser.
 * Label it with a wrapping <label> or aria-label.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} type="radio" className={cx(styles.radio, className)} {...rest} />;
});
