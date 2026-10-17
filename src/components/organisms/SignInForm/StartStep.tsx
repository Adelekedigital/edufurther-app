import { Button } from '@/components/atoms/Button/Button';
import { Input } from '@/components/atoms/Input/Input';
import { GoogleButton } from '@/components/molecules/GoogleButton/GoogleButton';
import { LegalLine } from '@/components/molecules/LegalLine/LegalLine';
import { emailTypoFix } from '@/lib/utils/emailTypo';
import { cx } from '@/lib/utils/cx';
import { FieldError } from './FieldError';
import { FullNameField } from './FullNameField';
import type { SignInMode, StartError } from './types';
import styles from './SignInForm.module.css';

const START_ERROR: Record<StartError, string> = {
  sendFailed: 'We couldn’t send your code. Check your connection and try again.',
  googleError: 'Google sign-in didn’t finish. Try again, or use your email.',
};

export type StartStepProps = {
  mode: SignInMode;
  email: string;
  onEmailChange: (value: string) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  nameError?: string;
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
  return (
    <div className={styles.step}>
      {signup && (
        <FullNameField value={fullName} onChange={onFullNameChange} serverError={nameError} />
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
          className={styles.input}
        />
      </label>
      {fix && (
        <p className={styles.typo}>
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
      {error && <FieldError>{START_ERROR[error]}</FieldError>}
      <Button
        type="submit"
        size="large"
        fullWidth
        disabled={!canSend || offline}
        busy={sending}
      >
        {sending ? 'Sending code…' : 'Email me a code'}
      </Button>
      <p className={styles.or}>or</p>
      <GoogleButton
        onClick={onGoogle}
        busy={googleBusy}
        disabled={offline}
        lastUsed={lastUsed && !signup}
      />
      {signup && <LegalLine />}
    </div>
  );
}
