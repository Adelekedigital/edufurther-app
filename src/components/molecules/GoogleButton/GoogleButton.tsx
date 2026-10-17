import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/utils/cx';
import styles from './GoogleButton.module.css';

/**
 * The G mark, from Google's branding guidelines. Its four colours are Google's
 * brand, not ours, so they are literals here rather than tokens — the mark may
 * never be recoloured, which is exactly what a token would invite.
 * Decorative: the button's own text is the label.
 */
function GoogleMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#ea4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285f4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#fbbc05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34a853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

type GoogleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & {
  /** Held from the press until the browser leaves for Google's consent screen. */
  busy?: boolean;
  /** This device last signed in with Google (Sign In.dc.html `lastUsed`, log-in only). */
  lastUsed?: boolean;
};

/**
 * "Continue with Google" (an approved label in Google's branding guidelines),
 * drawn as Sign In.dc.html draws it: white, an ink-300 hairline, ink-900 label,
 * 48px. Not the Button atom's outlined variant, whose blue values differ.
 * `disabled` covers offline: the design dims it to half.
 */
export const GoogleButton = forwardRef<HTMLButtonElement, GoogleButtonProps>(
  function GoogleButton({ busy, lastUsed, className, onClick, ...rest }, ref) {
    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        className={cx(styles.button, lastUsed && !busy && styles.withBadge, className)}
        // After ...rest, like the Button atom: busy wins whatever the caller passes.
        aria-busy={busy || undefined}
        // Not `disabled` while busy: that would drop focus mid-press.
        onClick={busy ? undefined : onClick}
      >
        <GoogleMark />
        {busy ? 'Taking you to Google…' : 'Continue with Google'}
        {lastUsed && !busy && (
          <span className={styles.badge}>
            <span className="sr-only">, </span>Last used
          </span>
        )}
      </button>
    );
  },
);
