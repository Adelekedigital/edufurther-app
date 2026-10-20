'use client';

import { useQueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/api/data/keys';
import { savePrimaryRole } from '@/lib/api/data/roles';
import { patchViewer } from '@/lib/api/data/viewer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SignInFormProps, SignInStep, StartError } from '@/components/organisms/SignInForm';
import {
  signedInUser,
  startGoogleSignIn,
  useSignOutHere,
  type SignInMode,
  type SignInRole,
} from '@/lib/api/data/auth';
import { useSaveName, zoneToSave, type NameToSave } from '@/lib/api/data/signIn';
import { useSession } from '@/lib/api/data/session';
import { lastSignInMethod, rememberSignInMethod } from '@/lib/utils/lastUsed';
import { checkFullName, splitFullName } from '@/lib/utils/name';
import { useHydrated } from '@/lib/utils/useHydrated';
import { useOnline } from '@/lib/utils/useOnline';
import { accountHome, signInOutcome, type Outcome } from './outcome';
import { loadAccount, toAccount } from './account';
import { useEmailCodeAuth } from './useEmailCodeAuth';

export { CODE_LIFETIME_MS, RESEND_WAIT_MS } from './useEmailCodeAuth';

/** The toast shows this long, then the page moves on (Sign In.dc.html `_finish`). */
export const TOAST_MS = 1400;
/** How long a Google return waits for the session before the card lets go. */
export const GOOGLE_WAIT_MS = 10_000;
export { ACCOUNT_RETRY_MS } from './account';

// PROVISIONAL: ours, no design state; the finish step's "Use a different email" didn't sign out.
export const SIGN_OUT_FAILED = 'We couldn’t sign you out. Try again.';
export const ROLE_SAVE_FAILED = 'We couldn’t save that you’re joining as a mentor. Try again.';

type Method = 'email' | 'google';
type GoogleUser = Awaited<ReturnType<typeof signedInUser>>;

/** The name Google gave: given + family when both came, else its whole name. */
function googleName(u: GoogleUser): string {
  if (u?.givenName && u.familyName) return `${u.givenName} ${u.familyName}`;
  return u?.fullName ?? u?.givenName ?? '';
}

type Account = {
  id: string;
  isAdmin: boolean;
  isMentor: boolean;
  mentorApproved: boolean;
  mentorApprovedSeen?: boolean;
  onboardingComplete: boolean | null;
  signedUpAsMentor: boolean;
  hasMentorProfile: boolean;
  isNew: boolean;
  /** `/me` `timezone`: the device's goes with the name only while this is unset or UTC. */
  timezone: string | null;
};

export type SignInFlowOptions = {
  mode: SignInMode;
  role: SignInRole;
  /** A checked return path (safeReturnTo), or null. */
  next: string | null;
  /** The first name of the mentor a booking `next` is with, for the toast ("Gbenga"). */
  bookingWith?: string | null;
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
export function useSignInFlow({
  mode,
  role,
  next,
  bookingWith = null,
  googleReturn,
  googleFailed,
}: SignInFlowOptions) {
  const router = useRouter();
  const qc = useQueryClient();
  const session = useSession();
  const online = useOnline();
  const saveName = useSaveName();
  const signOutHere = useSignOutHere();

  const [step, setStep] = useState<SignInStep>('start');
  const [fullName, setFullName] = useState('');
  const [startError, setStartError] = useState<StartError | undefined>(
    googleFailed ? 'googleError' : undefined,
  );
  const [googleBusy, setGoogleBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // The finish step's "Use a different email": out of this account, back to the start.
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string>();
  // Back from Google, the card waits for the session; if the SDK never says,
  // it lets go, so the page can't stay locked.
  const [googleWaitOver, setGoogleWaitOver] = useState(false);
  useEffect(() => {
    if (!googleReturn) return;
    const t = setTimeout(() => setGoogleWaitOver(true), GOOGLE_WAIT_MS);
    return () => clearTimeout(t);
  }, [googleReturn]);
  const [nameError, setNameError] = useState<string>();
  // The mentor role didn't save: the finish step says so and retries it.
  const [roleError, setRoleError] = useState<string>();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // This screen is finishing a sign-in itself: the "already signed in" redirect stands aside.
  const handling = useRef(googleReturn);
  const account = useRef<Account | null>(null);
  // The name is saved on the account: a role retry doesn't send it again.
  const named = useRef(false);
  const method = useRef<Method>('email');
  const mounted = useRef(true);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The post-sign-in step is defined below; the engine reaches it through this.
  const verified = useRef<() => Promise<void>>(() => Promise.resolve());
  const auth = useEmailCodeAuth({
    next,
    codeShowing: step === 'code',
    // This screen finishes the sign-in itself: the "already signed in" redirect stands aside.
    onVerifyStart: () => {
      handling.current = true;
    },
    onVerified: () => verified.current(),
    onVerifyRefused: () => {
      handling.current = false;
    },
    onBanned: () => setStep('suspended'),
  });

  const { setEmail } = auth;

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
        // The account's role, as saved, never the page's: the toast and the
        // destination match what the account is.
        role: a.signedUpAsMentor ? 'mentor' : 'mentee',
        isNew: a.isNew,
        firstName,
        isAdmin: a.isAdmin,
        isMentor: a.isMentor,
        mentorApproved: a.mentorApproved,
        mentorApprovedSeen: a.mentorApprovedSeen,
        onboardingComplete: a.onboardingComplete,
        signedUpAsMentor: a.signedUpAsMentor,
        googleJustLinked,
        next,
        bookingWith,
      });
      setOutcome(o);
      clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => router.replace(o.href), TOAST_MS);
    },
    [mode, next, bookingWith, router],
  );

  /**
   * A mentor sign-up's role, saved on a brand-new account before anything
   * routes (owner, 2026-10-20): the only place a role is set, so every later
   * visit continues as a mentor and no URL changes it. A returning account on
   * /signup?role=mentor keeps the role it settled (one role per account). A
   * failure stops on the finish step with a retry: never routed as a mentee.
   */
  const saveRole = useCallback(
    async (a: Account, onRefused?: () => void): Promise<boolean> => {
      const needed =
        mode === 'signup' &&
        role === 'mentor' &&
        a.isNew &&
        !a.hasMentorProfile &&
        !a.signedUpAsMentor;
      if (!needed) return true;
      try {
        await savePrimaryRole(a.id, 'mentor');
      } catch {
        onRefused?.();
        setRoleError(ROLE_SAVE_FAILED);
        setStep('finish');
        return false;
      }
      a.signedUpAsMentor = true;
      setRoleError(undefined);
      // The next page routes on the account alone, so a /me cached before the
      // save must already say so; then refetch it.
      patchViewer(qc, { signedUpAsMentor: true });
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
      return true;
    },
    [mode, role, qc],
  );

  /** A new account, named: its role, then the toast and the redirect. */
  const complete = useCallback(
    async (a: Account, firstName: string, onRefused?: () => void) => {
      if (!(await saveRole(a, onRefused)) || !mounted.current) return;
      finish(a, firstName);
    },
    [saveRole, finish],
  );

  const name = useCallback(
    async (a: Account, toSave: NameToSave, onRefused?: () => void): Promise<boolean> => {
      try {
        await saveName.mutateAsync({
          userId: a.id,
          name: toSave,
          timezone: zoneToSave(a.timezone),
        });
        named.current = true;
        return true;
      } catch (e) {
        // The session stays: the finish step offers the retry (PRD). Its
        // fields are filled first, so it never shows empty for a frame.
        onRefused?.();
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
      named.current = false;
      if (!a.isNew) {
        const google = via === 'google' ? await signedInUser() : null;
        if (!mounted.current) return;
        return finish(a, acct.firstName ?? '', !!google?.googleJustLinked);
      }
      if (via === 'google') {
        const g = await signedInUser();
        if (!mounted.current) return;
        const fromGoogle = googleName(g);
        // Only for the finish step: filled while the card waits, the start
        // form visibly types itself in before the page leaves.
        const prefill = () => {
          // Nobody typed an email on the way in: the finish step names this one.
          if (g?.email) setEmail(g.email);
          setFullName(fromGoogle);
        };
        if (checkFullName(fromGoogle) === null) {
          // Google's own split keeps a two-word given name ("Mary Jane") whole.
          const parts =
            g?.givenName && g.familyName
              ? { firstName: g.givenName, lastName: g.familyName }
              : null;
          // A refused save shows the finish step with Google's name in it.
          const saved = await name(a, parts ?? { fullName: fromGoogle }, prefill);
          const first = parts?.firstName ?? splitFullName(fromGoogle).firstName;
          if (saved && mounted.current) await complete(a, first, prefill);
          return;
        }
        // One word, or none, from Google: ask once, under the same rule.
        prefill();
        setStep('finish');
        return;
      }
      if (mode === 'signup' && checkFullName(fullName) === null) {
        const saved = await name(a, { fullName });
        if (saved && mounted.current) await complete(a, splitFullName(fullName).firstName);
        return;
      }
      setStep('finish');
    },
    [complete, finish, fullName, mode, name, next, router, setEmail],
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

  useEffect(() => {
    verified.current = () => afterSignInSafely('email');
  });

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
        setFullName(googleName(u));
        setStep('finish');
        return;
      }
      router.replace(next ?? (acct.kind === 'member' ? accountHome(acct) : '/'));
    })();
  }, [session.status, next, router, setEmail]);

  const onSendCode = async () => {
    setStartError(undefined);
    const sent = await auth.send();
    if (sent === 'sent') setStep('code');
    else if (sent === 'offline') setStartError('sendFailed');
    else if (sent === 'failed') setStartError('sendUnavailable');
  };

  const onFinish = async () => {
    const a = account.current;
    if (!a || finishing || signingOut) return;
    setFinishing(true);
    setNameError(undefined);
    setRoleError(undefined);
    const saved = named.current || (await name(a, { fullName }));
    if (saved && mounted.current) await complete(a, splitFullName(fullName).firstName);
    if (!mounted.current) return;
    setFinishing(false);
  };

  /**
   * "Use a different email" on the finish step: a session is behind it (an
   * abandoned Google try, say), so it ends on this device first, without
   * Logout's trip to /login, and the start step shows empty. It doesn't
   * bounce back: the session is gone before the start step shows (the SDK
   * reports SIGNED_OUT before its signOut resolves), so the "already signed
   * in" effect, which reads it, has nothing to act on, and its handling flag
   * is free again for the next sign-in on this page.
   */
  const leaveFinish = async () => {
    if (signingOut || finishing) return;
    setSigningOut(true);
    setSignOutError(undefined);
    const ended = await signOutHere();
    if (!mounted.current) return;
    setSigningOut(false);
    if (!ended) {
      setSignOutError(SIGN_OUT_FAILED);
      return;
    }
    account.current = null;
    handling.current = false;
    auth.setEmail('');
    auth.clearCode();
    setFullName('');
    setNameError(undefined);
    setRoleError(undefined);
    setStartError(undefined);
    setStep('start');
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
    email: auth.email,
    onEmailChange: (v) => {
      auth.setEmail(v);
      setStartError(undefined);
    },
    fullName,
    onFullNameChange: (v) => {
      setFullName(v);
      setNameError(undefined);
      setStartError(undefined);
    },
    nameError,
    roleError,
    sending: auth.sending,
    startError,
    googleBusy,
    lastUsed,
    onSendCode: () => void onSendCode(),
    onGoogle: () => void onGoogle(),
    code: auth.code,
    onCodeChange: auth.onCodeChange,
    onVerify: (c) => void auth.verify(c),
    verifying: auth.verifying,
    codeProblem: auth.codeProblem,
    resentCount: auth.resentCount,
    resendIn: auth.resendIn,
    onResend: () => void auth.resend(),
    onUseDifferentEmail: () => {
      if (step === 'finish') return void leaveFinish();
      // The code and suspended steps: no session yet, so only back to the start.
      setStep('start');
      auth.clearCode();
    },
    finishing,
    signingOut,
    signOutError,
    onFinish: () => void onFinish(),
    offline: !online,
    // Signed in on the start step: the account is being read (a Google return,
    // or a visitor already signed in), so nothing here takes a press. Back from
    // Google, that holds from the first frame, before the session is known.
    redirecting:
      outcome !== null ||
      (step === 'start' &&
        (session.status === 'present' ||
          (googleReturn && !googleWaitOver && session.status === 'unknown'))),
  };

  return { form, toast: outcome };
}
