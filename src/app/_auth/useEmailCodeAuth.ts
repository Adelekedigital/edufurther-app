'use client';

import { useEffect, useRef, useState } from 'react';
import type { CodeProblem } from '@/components/organisms/SignInForm/types';
import { sendSignInCode, verifySignInCode } from '@/lib/api/data/auth';
import { codeTries, recordMiss, resetTries } from '@/lib/utils/codeLock';
import { useLatest } from '@/lib/utils/useLatest';

/** A new code may be asked for this long after the last (handoff, Code rules). */
export const RESEND_WAIT_MS = 30_000;
/** Supabase's email OTP expiry, set to 600 s in the dashboard (PRD). */
export const CODE_LIFETIME_MS = 10 * 60_000;

export type EmailCodeAuthOptions = {
  /** Where the email's link would land (a checked path), or null. */
  next: string | null;
  /** Whether the code step is showing: the resend countdown ticks only then. */
  codeShowing: boolean;
  /** Right before a code goes out for checking. */
  onVerifyStart?: () => void;
  /** The code checked out. "Checking…" stays up until this settles. */
  onVerified: () => Promise<void>;
  /** The code was refused, for any reason. */
  onVerifyRefused?: () => void;
  /** The account is suspended (a Supabase ban). */
  onBanned: () => void;
};

/**
 * The email-code half of signing in, shared by the sign-in page and the
 * booking modal's guest step: the address, sending and resending (30 s
 * apart), checking the code with an on-screen count of misses (5, then 15
 * minutes), and telling an expired code from a wrong one by the clock, since
 * Supabase answers both alike (failure log #65).
 */
export function useEmailCodeAuth(opts: EmailCodeAuthOptions) {
  const latest = useLatest(opts);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeProblem, setCodeProblem] = useState<CodeProblem>();
  const [resentCount, setResentCount] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const sentAt = useRef(0);
  // Latches read at the moment of the call, not from a render's closure: an
  // autofilled sixth digit and an Enter in the same tick would both pass a
  // state check.
  const verifyingNow = useRef(false);
  const resendingNow = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The resend countdown ticks only while there is something to count.
  useEffect(() => {
    if (!opts.codeShowing || resendAt <= now) return;
    const t = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(t);
  }, [opts.codeShowing, resendAt, now]);

  /** A code went out: the clock, the count and the field start again. */
  const codeSent = (resend: boolean) => {
    const t = Date.now();
    sentAt.current = t;
    resetTries(email, t);
    setResendAt(t + RESEND_WAIT_MS);
    setNow(t);
    setCode('');
    const locked = codeTries(email, t).lockedUntil !== null;
    setCodeProblem(locked ? { kind: 'locked' } : undefined);
    if (resend) setResentCount((n) => n + 1);
  };

  /** Email a code. True when it went out (the caller shows the code step). */
  const send = async (): Promise<boolean> => {
    if (sending) return false;
    setSending(true);
    const r = await sendSignInCode(email, opts.next);
    if (!mounted.current) return false;
    setSending(false);
    if (!r.ok) return false;
    codeSent(false);
    return true;
  };

  const resend = async () => {
    if (resendingNow.current) return;
    resendingNow.current = true;
    const r = await sendSignInCode(email, opts.next);
    resendingNow.current = false;
    if (!mounted.current) return;
    if (r.ok) codeSent(true);
    else setCodeProblem({ kind: 'resendFailed' });
  };

  const verify = async (c: string) => {
    if (verifyingNow.current) return;
    verifyingNow.current = true;
    setVerifying(true);
    latest.current.onVerifyStart?.();
    const r = await verifySignInCode(email, c);
    if (r.ok) {
      resetTries(email);
      try {
        await latest.current.onVerified();
      } finally {
        verifyingNow.current = false;
        if (mounted.current) setVerifying(false);
      }
      return;
    }
    verifyingNow.current = false;
    if (!mounted.current) return;
    setVerifying(false);
    latest.current.onVerifyRefused?.();
    if (r.reason === 'banned') {
      setCode('');
      return latest.current.onBanned();
    }
    if (r.reason !== 'invalidCode') return; // offline or unknown: nothing counted, try again
    // Supabase can't tell an expired code from a wrong one; the clock can.
    if (Date.now() - sentAt.current >= CODE_LIFETIME_MS) return setCodeProblem({ kind: 'expired' });
    const t = recordMiss(email);
    setCodeProblem(
      t.lockedUntil !== null ? { kind: 'locked' } : { kind: 'wrong', triesLeft: t.triesLeft },
    );
  };

  return {
    email,
    setEmail,
    code,
    /** An edit clears a wrong-code or resend error; expired and locked stay. */
    onCodeChange: (c: string) => {
      setCode(c);
      setCodeProblem((p) => (p?.kind === 'wrong' || p?.kind === 'resendFailed' ? undefined : p));
    },
    sending,
    verifying,
    codeProblem,
    resentCount,
    resendIn: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    send,
    resend,
    verify,
    /** "Use a different email": the code and its state go; the address stays to edit. */
    clearCode: () => {
      setCode('');
      setCodeProblem(undefined);
      setResentCount(0);
    },
  };
}
