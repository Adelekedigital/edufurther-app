import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { GoogleMark } from '@/components/atoms/GoogleMark/GoogleMark';
import { cx } from '@/lib/utils/cx';
import styles from './GoogleButton.module.css';

type GoogleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & {
  /** Held from the press until the browser leaves for Google's consent screen. */
  busy?: boolean;
  /** This device last signed in with Google (Sign In.dc.html `lastUsed`, log-in only). */
  lastUsed?: boolean;
  /**
   * `large` (default): the sign-in screens' full-width 48px button. `medium`:
   * 40px and as wide as its words, beside another medium action (the profile's
   * review gate, next to "Continue with email").
   */
  size?: 'large' | 'medium';
};

/**
 * "Continue with Google" (an approved label in Google's branding guidelines),
 * drawn as Sign In.dc.html draws it: white, an ink-300 hairline, ink-900 label,
 * 48px. Not the Button atom's outlined variant, whose blue values differ.
 * `disabled` covers offline: the design dims it to half. It is rendered as
 * aria-disabled with the press ignored, never the native attribute: going
 * offline while the button has focus must not throw that focus to <body>.
 */
export const GoogleButton = forwardRef<HTMLButtonElement, GoogleButtonProps>(function GoogleButton(
  { busy, lastUsed, size = 'large', disabled, className, onClick, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={cx(
        styles.button,
        size === 'medium' && styles.medium,
        lastUsed && !busy && styles.withBadge,
        className,
      )}
      // After ...rest, like the Button atom: busy wins whatever the caller passes.
      aria-busy={busy || undefined}
      aria-disabled={disabled || undefined}
      // The whole name in one string: a name stitched from visible text and a
      // punctuation-led .sr-only piece loses its separator (failure log #51).
      aria-label={lastUsed && !busy ? 'Continue with Google, last used' : undefined}
      // Not `disabled` while busy either: that would drop focus mid-press.
      onClick={busy || disabled ? undefined : onClick}
    >
      <GoogleMark className={styles.mark} />
      {busy ? 'Taking you to Google…' : 'Continue with Google'}
      {lastUsed && !busy && (
        <span className={styles.badge} aria-hidden>
          Last used
        </span>
      )}
    </button>
  );
});
