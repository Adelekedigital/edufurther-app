'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import styles from './EmailCodeForm.module.css';

export type AuthFailure = 'rateLimited' | 'invalidCode' | 'offline' | 'unavailable' | 'unknown';
type Result = { ok: true } | { ok: false; reason: AuthFailure };

const FAILURE_COPY: Record<AuthFailure, string> = {
  rateLimited: 'Too many tries. Wait a minute, then send a new code.',
  invalidCode: 'That code didn’t work. Check it, or send a new one.',
  offline: 'You’re offline. Connect, then try again.',
  unavailable: 'Sign-in isn’t available right now. Try again later.',
  unknown: 'Something went wrong. Try again.',
};

/** Seconds before "Send a new code" is offered again (Supabase's own limit is 60s). */
const RESEND_AFTER = 60;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailCodeFormProps = {
  /** "Create a free account to finish booking", "Log in to EduFurther", … */
  title: string;
  /** Under the title, e.g. why an account is needed. */
  intro?: ReactNode;
  /** The switch line: "Have an account? Log in" (BookingModal.dc.html). */
  footer?: ReactNode;
  /**
   * Other ways to sign in, e.g. "or · Continue with Google". Shown on the
   * email step only: once a code is on its way, leaving for another method
   * would throw away the typed code and the resend timer.
   */
  alternatives?: ReactNode;
  onSendCode: (email: string) => Promise<Result>;
  onVerifyCode: (email: string, code: string) => Promise<Result>;
};

/**
 * Passwordless sign-in: email → 6-digit code (backend auth reply: email OTP).
 * Email step per BookingModal.dc.html's sign-up step; the code step is
 * PROVISIONAL (not in the design; design request, auth #1).
 * The same flow signs up a new address, so it serves Log in and Sign up.
 */
export function EmailCodeForm({
  title,
  intro,
  footer,
  alternatives,
  onSendCode,
  onVerifyCode,
}: EmailCodeFormProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const fieldRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const hintId = useId();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Each step starts with its field focused; an error sends focus back to it.
  useEffect(() => {
    fieldRef.current?.focus();
  }, [step]);

  const fail = (message: string) => {
    setError(message);
    fieldRef.current?.focus();
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    const r = await onSendCode(email.trim());
    setBusy(false);
    if (!r.ok) return fail(FAILURE_COPY[r.reason]);
    setCode('');
    setStep('code');
    setWait(RESEND_AFTER);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (step === 'email') {
      if (!EMAIL.test(email.trim())) return fail('Enter an email address like you@example.com.');
      return send();
    }
    if (!/^\d{6}$/.test(code)) return fail('Enter the 6-digit code from the email.');
    setBusy(true);
    setError(null);
    const r = await onVerifyCode(email.trim(), code);
    setBusy(false);
    if (!r.ok) fail(FAILURE_COPY[r.reason]);
  };

  const describedBy = [error ? errorId : null, step === 'code' ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <h1 className={styles.title}>{step === 'email' ? title : 'Check your email'}</h1>
      {step === 'email' && intro && <p className={styles.intro}>{intro}</p>}

      {step === 'email' ? (
        <label className={styles.label}>
          Email address
          <Input
            ref={fieldRef}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!error}
            aria-describedby={describedBy || undefined}
            required
          />
        </label>
      ) : (
        <>
          <p id={hintId} className={styles.intro}>
            <Icon name="mail" size={16} className={styles.mailIcon} />
            We sent a 6-digit code to <strong>{email.trim()}</strong>. The email also has a link
            that signs you in on this device.
          </p>
          <label className={styles.label}>
            6-digit code
            <Input
              ref={fieldRef}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              invalid={!!error}
              aria-describedby={describedBy || undefined}
              className={styles.code}
              required
            />
          </label>
        </>
      )}

      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          <Icon name="error" size={16} />
          {error}
        </p>
      )}

      <Button type="submit" size="large" fullWidth busy={busy}>
        {step === 'email' ? 'Continue with email' : 'Verify and continue'}
      </Button>

      {step === 'code' ? (
        <div className={styles.secondary}>
          <button
            type="button"
            className={styles.textButton}
            disabled={busy || wait > 0}
            onClick={() => void send()}
          >
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
          <button
            type="button"
            className={styles.textButton}
            disabled={busy}
            onClick={() => {
              setStep('email');
              setError(null);
            }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          {alternatives}
          {footer && <p className={styles.footer}>{footer}</p>}
        </>
      )}
    </form>
  );
}
