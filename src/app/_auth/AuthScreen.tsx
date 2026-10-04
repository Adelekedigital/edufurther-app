'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleButton } from '@/components/molecules/GoogleButton/GoogleButton';
import { Notice } from '@/components/molecules/Notice/Notice';
import { EmailCodeForm } from '@/components/organisms/EmailCodeForm/EmailCodeForm';
import {
  authConfigured,
  sendSignInCode,
  startGoogleSignIn,
  verifySignInCode,
} from '@/lib/api/data/auth';
import { useSession } from '@/lib/api/data/session';
import type { AuthFailureReason } from './failureReason';
import styles from './AuthScreen.module.css';

type AuthScreenProps = {
  mode: 'login' | 'signup';
  /** Where to go once signed in (already checked by safeReturnTo). */
  next: string;
  /** Set when they arrived from a sign-in that didn't finish. */
  failure?: AuthFailureReason;
};

const COPY = {
  login: {
    title: 'Log in to EduFurther',
    intro: undefined,
    switchText: 'New here?',
    switchLabel: 'Create a free account',
    switchTo: '/signup',
  },
  signup: {
    title: 'Create your free account',
    intro: 'Book free 1:1 sessions with mentors who have been through the process.',
    switchText: 'Have an account?',
    switchLabel: 'Log in',
    switchTo: '/login',
  },
} as const;

/** PROVISIONAL copy, like the rest of this screen (design request, auth #1). */
const FAILURE: Record<
  AuthFailureReason,
  { tone: 'neutral' | 'info'; icon: 'mail' | 'info' | 'error'; title: string; body: string }
> = {
  link: {
    tone: 'info',
    icon: 'mail',
    title: 'That sign-in link didn’t work here.',
    body: 'Links only work in the browser you asked from, and only once. Enter the 6-digit code from the email instead, or send a new one.',
  },
  google_cancelled: {
    tone: 'info',
    icon: 'info',
    title: 'Google sign-in was cancelled.',
    body: 'Nothing changed on your account. Try Google again, or use your email.',
  },
  google_failed: {
    tone: 'neutral',
    icon: 'error',
    title: 'Google sign-in didn’t work.',
    body: 'Try again, or use your email instead.',
  },
};

/**
 * Log in / Sign up. PROVISIONAL layout: the design has no standalone auth screen
 * (design request, auth #1); the form is the booking modal's sign-up step.
 * Passwordless, so both modes run the same flow and differ only in copy.
 */
export function AuthScreen({ mode, next, failure }: AuthScreenProps) {
  const router = useRouter();
  const session = useSession();
  const c = COPY[mode];
  // signInWithOAuth navigates away on success, so the only way back here is it
  // failing to start at all (the PKCE verifier cookie not writing, say). There
  // is no round trip to carry a reason then, so it is said here instead.
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleFailed, setGoogleFailed] = useState(false);
  const notice = googleFailed ? FAILURE.google_failed : failure && FAILURE[failure];

  // Signed in (just now, or already): go where they were headed.
  useEffect(() => {
    if (session.status === 'present') router.replace(next);
  }, [session.status, next, router]);

  // Back from Google restores this page from the back-forward cache with its
  // React state intact (Safari and Firefox), so the button would still read
  // "Taking you to Google…" and refuse every press. `pageshow` fires on that
  // restore, and harmlessly on a normal load.
  useEffect(() => {
    const clear = () => setGoogleBusy(false);
    window.addEventListener('pageshow', clear);
    return () => window.removeEventListener('pageshow', clear);
  }, []);

  const google = async () => {
    setGoogleBusy(true);
    setGoogleFailed(false);
    const r = await startGoogleSignIn(next);
    // Success means the browser is already on its way to Google: stay busy, so
    // the button can't be pressed again while that navigation starts.
    if (!r.ok) {
      setGoogleBusy(false);
      setGoogleFailed(true);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link href="/explore" className={styles.logo} aria-label="EduFurther home">
          <Image src="/brand/edufurther-logo-full.png" alt="" width={180} height={24} priority />
        </Link>
        {notice && (
          <Notice tone={notice.tone} icon={notice.icon} title={notice.title}>
            {notice.body}
          </Notice>
        )}
        {authConfigured ? (
          <>
            <EmailCodeForm
              title={c.title}
              intro={c.intro}
              onSendCode={(email) => sendSignInCode(email, next)}
              onVerifyCode={verifySignInCode}
            />
            <p className={styles.divider}>or</p>
            <GoogleButton onClick={() => void google()} busy={googleBusy} />
            <p className={styles.switch}>
              {c.switchText}{' '}
              <Link href={`${c.switchTo}?next=${encodeURIComponent(next)}`}>{c.switchLabel}</Link>
            </p>
          </>
        ) : (
          <Notice tone="neutral" icon="error" title="Sign-in isn’t available right now.">
            You can still browse mentors. <Link href="/explore">Go to Explore</Link>
          </Notice>
        )}
      </div>
    </main>
  );
}
