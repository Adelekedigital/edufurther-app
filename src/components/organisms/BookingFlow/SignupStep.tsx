import Link from 'next/link';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import styles from './BookingFlow.module.css';

type Props = {
  /** The chosen time, as the flow says it ("Fri, Oct 2 · 4:00 am"). */
  picked: string;
  signedUp: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  /** "Continue with Google": the same as the flow's Continue. */
  onContinue: () => void;
  busy: boolean;
};

/** A guest's account step, after choosing a time (signupAt=afterTime). */
export function SignupStep(p: Props) {
  return (
    <div className={styles.signup}>
      <p className={styles.hold}>
        <Icon name="lock_clock" size={16} />
        {p.picked} is held for you for 10 minutes
      </p>
      {p.signedUp ? (
        // After signing up (e.g. a retry after an error): no second form.
        <p className={styles.signedUp}>
          <Icon name="check_circle" size={16} />
          {p.email ? `Signed up as ${p.email}` : 'You’re signed up'}
        </p>
      ) : (
        <>
          <h3 className={styles.signupTitle}>Create a free account to finish booking</h3>
          <Button variant="dark" size="medium" fullWidth busy={p.busy} onClick={p.onContinue}>
            Continue with Google
          </Button>
          <span className={styles.or}>or</span>
          <label className={styles.field}>
            <span className={styles.fieldLabelStrong}>Email address</span>
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={p.email}
              onChange={(e) => p.onEmailChange(e.target.value)}
            />
          </label>
          <span className={styles.login}>
            Have an account? <Link href="/login">Log in</Link>
          </span>
        </>
      )}
    </div>
  );
}
