import { useId, type ReactNode } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import styles from './FormField.module.css';

/** What the control needs to be labelled and described by the field (Input, Textarea, Select). */
export type FieldControlProps = {
  id: string;
  'aria-describedby'?: string;
  /** The atoms turn this into aria-invalid. */
  invalid: boolean;
};

type FormFieldProps = {
  label: string;
  /** Guidance under the control (design: 12px, ink-500). */
  hint?: ReactNode;
  /**
   * Right of the label, e.g. "120 / 500". Not a live region: announcing every
   * keystroke is noise. The control's maxLength does the enforcing.
   */
  counter?: string;
  /** Our copy for what is wrong. Replaces nothing: the hint stays. */
  error?: string;
  /** A 12px label, for forms set in place on a page (Mentor Profile.dc.html edit). */
  compact?: boolean;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Label, control, hint (Session Types.dc.html "Session name", "What mentees
 * get"). The error line is ours: the design draws no invalid state.
 */
export function FormField({ label, hint, counter, error, compact, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label
          htmlFor={id}
          className={compact ? `${styles.label} ${styles.compact}` : styles.label}
        >
          {label}
        </label>
        {counter && <span className={styles.counter}>{counter}</span>}
      </div>
      {children({
        id,
        'aria-describedby': describedBy,
        invalid: !!error,
      })}
      {error && (
        <p id={errorId} className={styles.error}>
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
