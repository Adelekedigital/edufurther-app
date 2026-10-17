'use client';

import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/atoms/Icon/Icon';
import { checkFullName } from '@/lib/utils/name';
import { isEmail } from '@/lib/utils/emailTypo';
import { cx } from '@/lib/utils/cx';
import { CODE_LENGTH, CodeStep, type CodeStepProps } from './CodeStep';
import { FinishStep } from './FinishStep';
import { StartStep } from './StartStep';
import { SuspendedStep } from './SuspendedStep';
import type { SignInMode, SignInRole, SignInStep, StartError } from './types';
import styles from './SignInForm.module.css';

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

  sending?: boolean;
  startError?: StartError;
  googleBusy?: boolean;
  /** This device last signed in with Google: the badge, at log-in only. */
  lastUsed?: boolean;
  onSendCode: () => void;
  onGoogle: () => void;

  code: CodeStepProps['code'];
  onCodeChange: CodeStepProps['onCodeChange'];
  onVerify: CodeStepProps['onVerify'];
  verifying?: boolean;
  codeProblem?: CodeStepProps['problem'];
  resentCount?: number;
  resendIn: number;
  onResend: () => void;
  onUseDifferentEmail: () => void;

  finishing?: boolean;
  onFinish: () => void;

  offline?: boolean;
  /** The toast is up and the page is leaving: nothing takes a press. */
  redirecting?: boolean;
  /** The booking / invite line above the title (start step only). */
  context?: ReactNode;
  /** "Have an account? Log in" / "New to EduFurther? Sign up". */
  switchHref: string;
  /** "Join as a mentor" / "Continue as a mentee" (sign-up only). */
  roleHref: string;
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);

  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  const canSend = isEmail(p.email) && !(signup && checkFullName(p.fullName) !== null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (redirecting) return;
    const stuck = p.codeProblem?.kind === 'locked' || p.codeProblem?.kind === 'expired';
    if (step === 'start' && canSend && !offline && !p.sending) p.onSendCode();
    else if (step === 'code' && p.code.length === CODE_LENGTH && !p.verifying && !stuck) {
      p.onVerify(p.code);
    } else if (step === 'finish' && checkFullName(p.fullName) === null && !p.finishing) {
      p.onFinish();
    }
  };

  const { title, sub } = heading(p);

  return (
    <form
      className={cx(styles.card, redirecting && styles.redirecting)}
      onSubmit={submit}
      noValidate
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
        <div role="status" className={styles.offline}>
          <Icon name="wifi_off" size={18} />
          You’re offline. Connect to the internet to get your code.
        </div>
      )}
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
          code={p.code}
          onCodeChange={p.onCodeChange}
          onVerify={p.onVerify}
          verifying={p.verifying}
          problem={p.codeProblem}
          resentCount={p.resentCount}
          resendIn={p.resendIn}
          onResend={p.onResend}
          onUseDifferentEmail={p.onUseDifferentEmail}
        />
      )}
      {step === 'finish' && (
        <FinishStep
          fullName={p.fullName}
          onFullNameChange={p.onFullNameChange}
          nameError={p.nameError}
          finishing={p.finishing}
        />
      )}
      {step === 'suspended' && <SuspendedStep onUseDifferentEmail={p.onUseDifferentEmail} />}

      {step === 'start' && !redirecting && (
        <p className={styles.switch}>
          {signup ? 'Have an account?' : 'New to EduFurther?'}{' '}
          <Link href={p.switchHref}>{signup ? 'Log in' : 'Sign up'}</Link>
        </p>
      )}

      {signup && step === 'start' && !redirecting && (
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
