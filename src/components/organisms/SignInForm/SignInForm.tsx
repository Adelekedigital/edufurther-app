'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { checkFullName } from '@/lib/utils/name';
import { isEmail } from '@/lib/utils/emailTypo';
import { cx } from '@/lib/utils/cx';
import { CODE_LENGTH, CodeStep } from './CodeStep';
import { FinishStep } from './FinishStep';
import { StartStep } from './StartStep';
import { SuspendedStep } from './SuspendedStep';
import type { CodeProblem, SignInMode, SignInRole, SignInStep, StartError } from './types';
import styles from './SignInForm.module.css';

const OFFLINE = 'You’re offline. Connect to the internet to get your code.';
const noop = () => {};

/**
 * Everything is controlled by the page. What the page clears, and when:
 * - `startError` when the email or name is edited, or a new attempt starts;
 * - `nameError` when the name is edited (it overrides the live rule);
 * - `codeProblem` when the code is edited (an old error must not sit under a
 *   new code), and `code` itself after a wrong answer is fine to keep: the
 *   field selects it, so the next digits replace it;
 * - `onVerify` / `onSendCode` / `onFinish` calls while that call is pending
 *   are the page's to ignore (`verifying`, `sending`, `finishing`).
 */
export type SignInFormProps = {
  mode: SignInMode;
  role: SignInRole;
  step: SignInStep;

  /** Kept by the page across steps, so "Use a different email" and Back keep what was typed. */
  email: string;
  onEmailChange: (value: string) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  /** A server refusal of the name, in our words. */
  nameError?: string;

  // Start step.
  sending?: boolean;
  startError?: StartError;
  googleBusy?: boolean;
  /** This device last signed in with Google: the badge, at log-in only. */
  lastUsed?: boolean;
  onSendCode: () => void;
  onGoogle: () => void;

  // Code step (and "Use a different email" on the suspended step).
  code?: string;
  onCodeChange?: (code: string) => void;
  onVerify?: (code: string) => void;
  verifying?: boolean;
  codeProblem?: CodeProblem;
  resentCount?: number;
  /** Seconds until "Send a new code" may be pressed. */
  resendIn?: number;
  onResend?: () => void;
  onUseDifferentEmail?: () => void;

  // Finish step.
  finishing?: boolean;
  onFinish?: () => void;

  offline?: boolean;
  /** The toast is up and the page is leaving: nothing takes a press or a key. */
  redirecting?: boolean;
  /** The booking / invite line above the title (start step only). */
  context?: ReactNode;
  /** "Have an account? Log in" / "New to EduFurther? Sign up". */
  switchHref: string;
  /** "Join as a mentor" / "Continue as a mentee": sign-up only, and only when given. */
  roleHref?: string;
};

function heading(p: SignInFormProps): { title: string; sub?: string } {
  if (p.step === 'suspended') {
    return {
      title: 'We can’t log you in',
      sub: `The account for ${p.email} is suspended. If you think this is a mistake, contact us and we’ll look into it.`,
    };
  }
  if (p.step === 'finish') {
    return {
      title: 'Finish creating your account',
      sub: `There’s no EduFurther account for ${p.email} yet. Add your name and we’ll set one up.`,
    };
  }
  if (p.step === 'code') return { title: 'Check your email', sub: `We sent a 6-digit code to ${p.email}.` };
  // Sign-up has no subline (`signupSub=hide`, the saved default).
  if (p.mode === 'signup') return { title: p.role === 'mentor' ? 'Apply to mentor' : 'Create your free account' };
  return { title: 'Log in', sub: 'Welcome back. Pick up where you left off.' };
}

/**
 * Log in and sign up, for mentees and mentors (Sign In.dc.html, saved
 * defaults: passwordless, one Full name field, unknown emails continue).
 * Props only: the page owns the flow, the calls and where people land.
 * Enter submits every step; focus moves to the heading on each step change.
 */
export function SignInForm(p: SignInFormProps) {
  const { mode, role, step, offline, redirecting } = p;
  const signup = mode === 'signup';
  const code = p.code ?? '';
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);
  // Enter with a name that doesn't pass: the button is off, so say why.
  const [revealName, setRevealName] = useState(false);

  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  const asksName = (step === 'start' && signup) || step === 'finish';
  const nameOk = checkFullName(p.fullName) === null;
  const canSend = isEmail(p.email) && !(signup && !nameOk);

  const keyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && asksName && !nameOk) setRevealName(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (redirecting) return;
    const stuck = p.codeProblem?.kind === 'locked' || p.codeProblem?.kind === 'expired';
    if (step === 'start' && canSend && !offline && !p.sending && !p.googleBusy) p.onSendCode();
    else if (step === 'code' && code.length === CODE_LENGTH && !p.verifying && !stuck) {
      p.onVerify?.(code);
    } else if (step === 'finish' && nameOk && !p.finishing) {
      p.onFinish?.();
    }
  };

  const { title, sub } = heading(p);

  return (
    <form
      className={cx(styles.card, redirecting && styles.redirecting)}
      onSubmit={submit}
      onKeyDown={keyDown}
      noValidate
      // Not just the pointer: a key on a focused button must not start a
      // second sign-in while the page is leaving.
      inert={redirecting}
      aria-busy={redirecting || undefined}
    >
      <Image
        src="/brand/edufurther-logo-full.png"
        alt="EduFurther"
        width={210}
        height={28}
        priority
        className={styles.logo}
      />
      {offline && (
        <div className={styles.offline}>
          <Icon name="wifi_off" size={18} />
          {OFFLINE}
        </div>
      )}
      {/* Always mounted, so losing the connection mid-flow is heard. */}
      <LiveRegion message={offline ? { text: OFFLINE, id: 1 } : null} />
      {step === 'start' && !redirecting && p.context}

      <div className={styles.header}>
        {role === 'mentor' && signup && <span className={styles.eyebrow}>For mentors</span>}
        <h1 ref={titleRef} tabIndex={-1} className={styles.title}>
          {title}
        </h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>

      {step === 'start' && (
        <StartStep
          mode={mode}
          email={p.email}
          onEmailChange={p.onEmailChange}
          fullName={p.fullName}
          onFullNameChange={p.onFullNameChange}
          nameError={p.nameError}
          revealName={revealName}
          canSend={canSend}
          sending={p.sending}
          error={p.startError}
          offline={offline}
          googleBusy={p.googleBusy}
          lastUsed={p.lastUsed}
          onGoogle={p.onGoogle}
        />
      )}
      {step === 'code' && (
        <CodeStep
          sentTo={p.email}
          code={code}
          onCodeChange={p.onCodeChange ?? noop}
          onVerify={p.onVerify ?? noop}
          verifying={p.verifying}
          problem={p.codeProblem}
          resentCount={p.resentCount}
          resendIn={p.resendIn ?? 0}
          onResend={p.onResend ?? noop}
          onUseDifferentEmail={p.onUseDifferentEmail ?? noop}
        />
      )}
      {step === 'finish' && (
        <FinishStep
          fullName={p.fullName}
          onFullNameChange={p.onFullNameChange}
          nameError={p.nameError}
          revealName={revealName}
          finishing={p.finishing}
        />
      )}
      {step === 'suspended' && <SuspendedStep onUseDifferentEmail={p.onUseDifferentEmail ?? noop} />}

      {step === 'start' && !redirecting && (
        <p className={styles.switch}>
          {signup ? 'Have an account?' : 'New to EduFurther?'}{' '}
          <Link href={p.switchHref}>{signup ? 'Log in' : 'Sign up'}</Link>
        </p>
      )}

      {signup && step === 'start' && !redirecting && p.roleHref && (
        <div className={styles.roleRow}>
          {role === 'mentor' ? 'Looking for a mentor?' : 'Want to give back?'}
          <Link href={p.roleHref} className={styles.roleLink}>
            {role === 'mentor' ? 'Continue as a mentee' : 'Join as a mentor'}
            <Icon name="arrow_forward" size={18} />
          </Link>
        </div>
      )}
    </form>
  );
}
