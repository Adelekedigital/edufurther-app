'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SignInFormProps } from '@/components/organisms/SignInForm/SignInForm';
import type { CodeProblem, SignInStep, StartError } from '@/components/organisms/SignInForm/types';
import {
  sendSignInCode,
  signedInUser,
  startGoogleSignIn,
  verifySignInCode,
  type SignInMode,
  type SignInRole,
} from '@/lib/api/data/auth';
import {
  fetchSignInAccount,
  useSaveName,
  type NameToSave,
  type SignInAccount,
} from '@/lib/api/data/signIn';
import { useSession } from '@/lib/api/data/session';
import { codeTries, recordMiss, resetTries } from '@/lib/utils/codeLock';
import { lastSignInMethod, rememberSignInMethod } from '@/lib/utils/lastUsed';
import { checkFullName, splitFullName } from '@/lib/utils/name';
import { useHydrated } from '@/lib/utils/useHydrated';
import { useOnline } from '@/lib/utils/useOnline';
import { accountHome, signInOutcome, type Outcome } from './outcome';

/** The toast shows this long, then the page moves on (Sign In.dc.html `_finish`). */
export const TOAST_MS = 1400;
/** A new code may be asked for this long after the last (handoff, Code rules). */
export const RESEND_WAIT_MS = 30_000;
/** Supabase's email OTP expiry, set to 600 s in the dashboard (PRD). */
export const CODE_LIFETIME_MS = 10 * 60_000;
/** A failed GET /me right after sign-in is tried again after these waits. */
export const ACCOUNT_RETRY_MS = [400, 1200];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET /me, tried again on a failure (not on "no account"): a blip must not cost the name. */
async function loadAccount(): Promise<SignInAccount> {
  let acct = await fetchSignInAccount();
  for (const ms of ACCOUNT_RETRY_MS) {
    if (acct.kind !== 'error') break;
    await wait(ms);
    acct = await fetchSignInAccount();
  }
  return acct;
}

function toAccount(acct: Extract<SignInAccount, { kind: 'member' }>) {
  return {
    id: acct.id,
    isAdmin: acct.isAdmin,
    isMentor: acct.isMentor,
    mentorApproved: acct.mentorApproved,
    isNew: acct.firstName === null,
  };
}

type Method = 'email' | 'google';
type Account = {
  id: string;
  isAdmin: boolean;
  isMentor: boolean;
  mentorApproved: boolean;
  isNew: boolean;
};

export type SignInFlowOptions = {
  mode: SignInMode;
  role: SignInRole;
  /** A checked return path (safeReturnTo), or null. */
  next: string | null;
  /** Back from Google with a session: finish the sign-in here. */
  googleReturn: boolean;
  /** Back from Google without one. */
  googleFailed: boolean;
};

/**
 * The sign-in flow behind SignInForm: send, verify, name a new account, then
 * the toast and the redirect. Role comes from the account, not the page; the
 * page's role only says where a brand-new mentor sign-up goes.
 */
export function useSignInFlow({ mode, role, next, googleReturn, googleFailed }: SignInFlowOptions) {
  const router = useRouter();
  const session = useSession();
  const online = useOnline();
  const saveName = useSaveName();

  const [step, setStep] = useState<SignInStep>('start');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [startError, setStartError] = useState<StartError | undefined>(
    googleFailed ? 'googleError' : undefined,
  );
  const [googleBusy, setGoogleBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeProblem, setCodeProblem] = useState<CodeProblem>();
  const [resentCount, setResentCount] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // This screen is finishing a sign-in itself: the "already signed in" redirect stands aside.
  const handling = useRef(googleReturn);
  const sentAt = useRef(0);
  const account = useRef<Account | null>(null);
  const method = useRef<Method>('email');
  // Latches read at the moment of the call, not from a render's closure: an
  // autofilled sixth digit and an Enter in the same tick would both pass a
  // state check.
  const verifyingNow = useRef(false);
  const resendingNow = useRef(false);
  const mounted = useRef(true);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Leaving the page during the toast (Back, a link) cancels the redirect.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(redirectTimer.current);
    };
  }, []);

  // Storage isn't there on the server: read it once the client runs.
  const hydrated = useHydrated();
  const lastUsed = hydrated && lastSignInMethod() === 'google';

  // The resend countdown ticks only while there is something to count.
  useEffect(() => {
    if (step !== 'code' || resendAt <= now) return;
    const t = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(t);
  }, [step, resendAt, now]);

  // Back from Google (bfcache restores the busy button): let it be pressed again.
  useEffect(() => {
    const clear = () => setGoogleBusy(false);
    window.addEventListener('pageshow', clear);
    return () => window.removeEventListener('pageshow', clear);
  }, []);

  // A read error or return flag should not come back on reload.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('error') && !url.searchParams.has('auth')) return;
    url.searchParams.delete('error');
    url.searchParams.delete('auth');
    window.history.replaceState(window.history.state, '', url);
  }, []);

  const finish = useCallback(
    (a: Account, firstName: string, googleJustLinked = false) => {
      const o = signInOutcome({
        method: method.current,
        mode,
        role,
        isNew: a.isNew,
        firstName,
        isAdmin: a.isAdmin,
        isMentor: a.isMentor,
        mentorApproved: a.mentorApproved,
        googleJustLinked,
        next,
      });
      setOutcome(o);
      clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => router.replace(o.href), TOAST_MS);
    },
    [mode, role, next, router],
  );

  const name = useCallback(
    async (a: Account, toSave: NameToSave): Promise<boolean> => {
      try {
        await saveName.mutateAsync({ userId: a.id, name: toSave });
        return true;
      } catch (e) {
        // The session stays: the finish step offers the retry (PRD).
        setNameError((e as Error).message);
        setStep('finish');
        return false;
      }
    },
    [saveName],
  );

  /** After the code or Google: who is this, do they need a name, where do they go. */
  const afterSignIn = useCallback(
    async (via: Method) => {
      method.current = via;
      rememberSignInMethod(via);
      const acct = await loadAccount();
      if (!mounted.current) return;
      // `/` explains a missing or unlinked account (409), so never skip it for
      // `next`; a /me that keeps failing goes on rather than stranding them.
      if (acct.kind === 'noAccount') return router.replace('/');
      if (acct.kind === 'error') return router.replace(next ?? '/');
      const a = toAccount(acct);
      account.current = a;
      if (!a.isNew) {
        const google = via === 'google' ? await signedInUser() : null;
        if (!mounted.current) return;
        return finish(a, acct.firstName ?? '', !!google?.googleJustLinked);
      }
      if (via === 'google') {
        const g = await signedInUser();
        if (!mounted.current) return;
        if (g?.givenName && g.familyName) {
          // In the field first, so a refused save shows the finish step with it.
          setFullName(`${g.givenName} ${g.familyName}`);
          const saved = await name(a, { firstName: g.givenName, lastName: g.familyName });
          if (saved && mounted.current) finish(a, g.givenName);
          return;
        }
        // No family name from Google: ask once, under the same rule.
        setFullName(g?.givenName ?? '');
        setStep('finish');
        return;
      }
      if (mode === 'signup' && checkFullName(fullName) === null) {
        const saved = await name(a, { fullName });
        if (saved && mounted.current) finish(a, splitFullName(fullName).firstName);
        return;
      }
      setStep('finish');
    },
    [finish, fullName, mode, name, next, router],
  );

  /** Something threw after sign-in (storage, the SDK): go on rather than hang on "Checking...". */
  const afterSignInSafely = useCallback(
    async (via: Method) => {
      try {
        await afterSignIn(via);
      } catch {
        if (mounted.current) router.replace(next ?? '/');
      }
    },
    [afterSignIn, next, router],
  );

  // Back from Google with a session.
  const googleHandled = useRef(false);
  useEffect(() => {
    if (!googleReturn || googleHandled.current || session.status !== 'present') return;
    googleHandled.current = true;
    void afterSignInSafely('google');
  }, [googleReturn, session.status, afterSignInSafely]);

  // Already signed in and not mid-flow: straight on, no toast. An account
  // that was never named (a reload on the finish step, or back later) is
  // asked for its name first: signing in again doesn't skip naming.
  useEffect(() => {
    if (session.status !== 'present' || handling.current) return;
    handling.current = true;
    void (async () => {
      const acct = await loadAccount();
      if (!mounted.current) return;
      if (acct.kind === 'member' && acct.firstName === null) {
        account.current = toAccount(acct);
        const u = await signedInUser().catch(() => null);
        if (!mounted.current) return;
        if (u?.email) setEmail(u.email);
        setFullName([u?.givenName, u?.familyName].filter(Boolean).join(' '));
        setStep('finish');
        return;
      }
      router.replace(next ?? (acct.kind === 'member' ? accountHome(acct) : '/'));
    })();
  }, [session.status, next, router]);

  const startCode = (resend: boolean) => {
    const t = Date.now();
    sentAt.current = t;
    resetTries(email, t);
    setResendAt(t + RESEND_WAIT_MS);
    setNow(t);
    setCode('');
    const locked = codeTries(email, t).lockedUntil !== null;
    setCodeProblem(locked ? { kind: 'locked' } : undefined);
    if (resend) setResentCount((n) => n + 1);
    else setStep('code');
  };

  const onSendCode = async () => {
    if (sending) return;
    setSending(true);
    setStartError(undefined);
    const r = await sendSignInCode(email, next);
    setSending(false);
    if (!r.ok) return setStartError('sendFailed');
    startCode(false);
  };

  const onResend = async () => {
    if (resendingNow.current) return;
    resendingNow.current = true;
    const r = await sendSignInCode(email, next);
    resendingNow.current = false;
    if (r.ok) startCode(true);
    else setCodeProblem({ kind: 'resendFailed' });
  };

  const onVerify = async (c: string) => {
    if (verifyingNow.current) return;
    verifyingNow.current = true;
    setVerifying(true);
    handling.current = true;
    const r = await verifySignInCode(email, c);
    if (r.ok) {
      resetTries(email);
      await afterSignInSafely('email');
      verifyingNow.current = false;
      if (mounted.current) setVerifying(false);
      return;
    }
    verifyingNow.current = false;
    handling.current = false;
    setVerifying(false);
    if (r.reason === 'banned') {
      setCode('');
      return setStep('suspended');
    }
    if (r.reason !== 'invalidCode') return; // offline or unknown: nothing counted, try again
    // Supabase can't tell an expired code from a wrong one; the clock can.
    if (Date.now() - sentAt.current >= CODE_LIFETIME_MS) return setCodeProblem({ kind: 'expired' });
    const t = recordMiss(email);
    setCodeProblem(
      t.lockedUntil !== null ? { kind: 'locked' } : { kind: 'wrong', triesLeft: t.triesLeft },
    );
  };

  const onFinish = async () => {
    const a = account.current;
    if (!a || finishing) return;
    setFinishing(true);
    setNameError(undefined);
    const saved = await name(a, { fullName });
    if (!mounted.current) return;
    setFinishing(false);
    if (saved) finish(a, splitFullName(fullName).firstName);
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    setStartError(undefined);
    const r = await startGoogleSignIn(next, mode, role);
    // Success: the browser is already leaving for Google, so stay busy.
    if (!r.ok) {
      setGoogleBusy(false);
      setStartError('googleError');
    }
  };

  const form: Omit<SignInFormProps, 'switchHref' | 'roleHref' | 'context'> = {
    mode,
    role,
    step,
    email,
    onEmailChange: (v) => {
      setEmail(v);
      setStartError(undefined);
    },
    fullName,
    onFullNameChange: (v) => {
      setFullName(v);
      setNameError(undefined);
      setStartError(undefined);
    },
    nameError,
    sending,
    startError,
    googleBusy,
    lastUsed,
    onSendCode: () => void onSendCode(),
    onGoogle: () => void onGoogle(),
    code,
    onCodeChange: (c) => {
      setCode(c);
      setCodeProblem((p) => (p?.kind === 'wrong' || p?.kind === 'resendFailed' ? undefined : p));
    },
    onVerify: (c) => void onVerify(c),
    verifying,
    codeProblem,
    resentCount,
    resendIn: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    onResend: () => void onResend(),
    onUseDifferentEmail: () => {
      setStep('start');
      setCode('');
      setCodeProblem(undefined);
      setResentCount(0);
    },
    finishing,
    onFinish: () => void onFinish(),
    offline: !online,
    // Signed in on the start step: the account is being read (a Google return,
    // or a visitor already signed in), so nothing here takes a press.
    redirecting: outcome !== null || (session.status === 'present' && step === 'start'),
  };

  return { form, toast: outcome };
}
