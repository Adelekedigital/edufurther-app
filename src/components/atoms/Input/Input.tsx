import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Input.module.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  /** Room for an icon or button inside the field (px of padding to reserve). */
  padStart?: boolean;
  padEnd?: boolean;
  fieldSize?: 'md' | 'lg';
};

/**
 * Text input. Needs a label from its caller — a <label>, aria-label or
 * aria-labelledby. 16px text on phones so iOS does not zoom (design PWA pass).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, padStart, padEnd, fieldSize = 'md', className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        styles.field,
        styles[fieldSize],
        padStart && styles.padStart,
        padEnd && styles.padEnd,
        className,
      )}
      {...rest}
      aria-invalid={invalid || undefined}
    />
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx(styles.field, styles.textarea, className)}
      {...rest}
      aria-invalid={invalid || undefined}
    />
  );
});
