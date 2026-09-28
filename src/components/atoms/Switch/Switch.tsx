import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './Switch.module.css';

type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'role' | 'aria-checked' | 'children'
> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Required: a switch has no visible text of its own. Use aria-labelledby if a label is on screen. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

/**
 * On/off switch — DS `FormControl type="toggle" size={20}` (39×24 track, 21px
 * knob). A button with role="switch", so Space and Enter both flip it and the
 * state is announced as on/off rather than checked.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, className, type, onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      role="switch"
      aria-checked={checked}
      className={cx(styles.switch, checked && styles.on, className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onChange(!checked);
      }}
      {...rest}
    >
      <span className={styles.knob} aria-hidden />
    </button>
  );
});
