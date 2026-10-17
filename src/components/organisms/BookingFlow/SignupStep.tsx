import { useEffect, useRef, type FormEvent } from 'react';
import { ButtonLink } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import { GoogleButton } from '@/components/molecules/GoogleButton/GoogleButton';
import { LegalLine } from '@/components/molecules/LegalLine/LegalLine';
import { CodeStep } from '@/components/organisms/SignInForm/CodeStep';
import { FieldError } from '@/components/organisms/SignInForm/FieldError';
import { FullNameField } from '@/components/organisms/SignInForm/FullNameField';
import { SUPPORT_EMAIL } from '@/lib/config/auth';
import { isEmail } from '@/lib/utils/emailTypo';
import { checkFullName } from '@/lib/utils/name';
import type { GuestPick, GuestSignIn } from './types';
import styles from './SignupStep.module.css';

const ERROR: Record<NonNullable<GuestSignIn['error']>, string> = {
  sendFailed: 'We couldn’t send your code. Check your connection and try again.',
  sendUnavailable: 'We couldn’t send your code right now. Try again in a few minutes.',
  googleError: 'Google sign-in didn’t finish. Try again, or use your email.',
};

type Props = {
  guest: GuestSignIn;
  pick: GuestPick | null;
  firstName: string;
};

/** "Email me a code" / "Create account" may be pressed (the footer's button). */
export function guestCanContinue(g: GuestSignIn): boolean {
  if (g.stage === 'email') return isEmail(g.email) && !g.offline && !g.googleBusy;
  if (g.stage === 'name') return checkFullName(g.fullName) === null;
  return false;
}

function heading(g: GuestSignIn, firstName: string): { title: string; sub: string } {
  if (g.stage === 'code')
    return { title: 'Check your email', sub: `We sent a 6-digit code to ${g.email}.` };
  if (g.stage === 'name') {
    // No "your time stays held": nothing holds it (Mentee onboarding PRD F3).
    return {
      title: 'Finish creating your account',
      sub: `Next, two quick questions so ${firstName} knows how to help.`,
    };
  }
  if (g.stage === 'suspended') {
    return {
      title: 'We can’t log you in',
      sub: `The account for ${g.email} is suspended. If you think this is a mistake, contact us and we’ll look into it.`,
    };
  }
  return {
    title: `Log in or sign up to book ${firstName}`,
    sub: 'Have an account? We’ll log you in. New here? We’ll create one.',
  };
}

/**
 * A guest's account step, after choosing a time (BookingModal.dc.html
 * `signupAt=afterTime`): email → 6-digit code → a name for a new account.
 * The page runs the sign-in (`guest`); the footer's button sends the code and
 * creates the account, and Enter does the same here. The code step brings its
 * own "Verify and continue".
 */
export function SignupStep({ guest: g, pick, firstName }: Props) {
  const { title, sub } = heading(g, firstName);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStage = useRef(g.stage);

  // A new stage (code sent, name asked) moves focus to its heading, as on the
  // sign-in page; not on first render, when the flow's step change handles it.
  useEffect(() => {
    if (shownStage.current === g.stage) return;
    shownStage.current = g.stage;
    titleRef.current?.focus({ preventScroll: true });
  }, [g.stage]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (g.stage === 'email' && guestCanContinue(g) && !g.sending) g.onSendCode();
    else if (g.stage === 'name' && guestCanContinue(g) && !g.finishing && pick) g.onFinish(pick);
  };

  return (
    <form className={styles.step} onSubmit={submit} noValidate>
      {/* PRD F3: the pick is remembered, not held (no hold exists yet). */}
      <p className={styles.note}>
        <Icon name="event_available" size={16} />
        Your pick is saved. We’ll take you back to book {firstName}.
      </p>
      <div className={styles.head}>
        <h3 ref={titleRef} tabIndex={-1} className={styles.title}>
          {title}
        </h3>
        <p className={styles.sub}>{sub}</p>
      </div>

      {g.stage === 'email' && (
        <div className={styles.email}>
          <label className={styles.label}>
            Email
            <Input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              fieldSize="xl"
              value={g.email}
              onChange={(e) => g.onEmailChange(e.target.value)}
              readOnly={g.sending || g.googleBusy}
            />
          </label>
          {g.error && <FieldError>{ERROR[g.error]}</FieldError>}
          <p className={styles.or}>or</p>
          <GoogleButton
            onClick={() => pick && g.onGoogle(pick)}
            busy={g.googleBusy}
            disabled={g.offline || g.sending || !pick}
          />
          <LegalLine />
        </div>
      )}

      {g.stage === 'code' && (
        <CodeStep
          sentTo={g.email}
          code={g.code}
          onCodeChange={g.onCodeChange}
          onVerify={g.onVerify}
          verifying={g.verifying}
          problem={g.codeProblem}
          resentCount={g.resentCount}
          resendIn={g.resendIn}
          onResend={g.onResend}
          onUseDifferentEmail={g.onUseDifferentEmail}
          verifyLabel="Verify and continue"
        />
      )}

      {g.stage === 'name' && (
        <FullNameField
          value={g.fullName}
          onChange={g.onFullNameChange}
          serverError={g.nameError}
          readOnly={g.finishing}
        />
      )}

      {g.stage === 'suspended' && (
        <ButtonLink href={`mailto:${SUPPORT_EMAIL}`} size="large" fullWidth>
          Contact support
        </ButtonLink>
      )}
    </form>
  );
}
