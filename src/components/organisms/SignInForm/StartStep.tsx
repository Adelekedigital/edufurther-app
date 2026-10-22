import { useId } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { GoogleButton } from '@/components/molecules/GoogleButton/GoogleButton';
import { LegalLine } from '@/components/molecules/LegalLine/LegalLine';
import { GOOGLE_SIGN_IN_FAILED } from '@/lib/copy/auth';
import { emailTypoFix } from '@/lib/utils/emailTypo';
import { cx } from '@/lib/utils/cx';
import { FieldError } from '@/components/molecules/FieldError/FieldError';
import { FullNameField } from '@/components/molecules/FullNameField/FullNameField';
import type { SignInMode, StartError } from './types';
import styles from './SignInForm.module.css';

const START_ERROR: Record<StartError, string> = {
  sendFailed: 'We couldn’t send your code. Check your connection and try again.',
  sendUnavailable: 'We couldn’t send your code right now. Try again in a few minutes.',
  googleError: GOOGLE_SIGN_IN_FAILED,
};

export type StartStepProps = {
  mode: SignInMode;
  email: string;
  onEmailChange: (value: string) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  nameError?: string;
  /** Enter was pressed with a name that doesn't pass: say why. */
  revealName?: boolean;
  /** "Email me a code" may be pressed: a valid email, and a valid name at sign-up. */
  canSend: boolean;
  sending?: boolean;
  error?: StartError;
  offline?: boolean;
  googleBusy?: boolean;
  lastUsed?: boolean;
  onGoogle: () => void;
};

/** Sign-up: Full name, Email; log-in: Email. Then the code button, "or", Google (Sign In.dc.html `isStart`). */
export function StartStep({
  mode,
  email,
  onEmailChange,
  fullName,
  onFullNameChange,
  nameError,
  revealName,
  canSend,
  sending,
  error,
  offline,
  googleBusy,
  lastUsed,
  onGoogle,
}: StartStepProps) {
  const signup = mode === 'signup';
  const fix = emailTypoFix(email);
  const typoId = useId();
  const errorId = useId();
  const describedBy = [fix && typoId, error && errorId].filter(Boolean).join(' ') || undefined;
  // One way in at a time: while a code is being sent, Google waits, and the
  // reverse; the fields hold still so the code step names the address used.
  const busy = !!sending || !!googleBusy;
  // Never the native `disabled`: any of these can change while the button has
  // focus (the connection drops or returns), and disabling a focused button
  // throws focus to <body>. aria-disabled, and the form's submit refuses.
  const held = !canSend || !!offline || !!googleBusy;
  return (
    <div className={styles.step}>
      {signup && (
        <FullNameField
          value={fullName}
          onChange={onFullNameChange}
          serverError={nameError}
          reveal={revealName}
          readOnly={busy}
        />
      )}
      <label className={styles.label}>
        Email
        <Input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          readOnly={busy}
          aria-describedby={describedBy}
          fieldSize="xl"
        />
      </label>
      {fix && (
        <p id={typoId} className={styles.typo}>
          Did you mean{' '}
          <button
            type="button"
            className={cx(styles.textButton, styles.xs)}
            onClick={() => onEmailChange(fix)}
          >
            {fix}
          </button>
          ?
        </p>
      )}
      {error && <FieldError id={errorId}>{START_ERROR[error]}</FieldError>}
      <Button
        type="submit"
        size="large"
        fullWidth
        aria-disabled={held || undefined}
        className={cx(held && styles.held)}
        busy={sending}
      >
        {sending ? 'Sending code…' : 'Email me a code'}
      </Button>
      <p className={styles.or}>or</p>
      <GoogleButton
        onClick={onGoogle}
        busy={googleBusy}
        disabled={offline || sending}
        lastUsed={lastUsed && !signup}
      />
      {signup && <LegalLine />}
    </div>
  );
}
