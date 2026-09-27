'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Notice } from '@/components/molecules/Notice/Notice';
import { EmailCodeForm } from '@/components/organisms/EmailCodeForm/EmailCodeForm';
import { authConfigured, sendSignInCode, verifySignInCode } from '@/lib/api/data/auth';
import { useSession } from '@/lib/api/data/session';
import styles from './AuthScreen.module.css';

type AuthScreenProps = {
  mode: 'login' | 'signup';
  /** Where to go once signed in (already checked by safeReturnTo). */
  next: string;
  /** The magic link failed (opened in another browser, or expired). */
  linkFailed: boolean;
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

/**
 * Log in / Sign up. PROVISIONAL layout: the design has no standalone auth screen
 * (design request, auth #1); the form is the booking modal's sign-up step.
 * Passwordless, so both modes run the same flow and differ only in copy.
 */
export function AuthScreen({ mode, next, linkFailed }: AuthScreenProps) {
  const router = useRouter();
  const session = useSession();
  const c = COPY[mode];

  // Signed in (just now, or already): go where they were headed.
  useEffect(() => {
    if (session.status === 'present') router.replace(next);
  }, [session.status, next, router]);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Link href="/explore" className={styles.logo} aria-label="EduFurther home">
          <Image src="/brand/edufurther-logo-full.png" alt="" width={180} height={24} priority />
        </Link>
        {linkFailed && (
          <Notice tone="info" icon="mail" title="That sign-in link didn’t work here.">
            Links only work in the browser you asked from, and only once. Enter the 6-digit code
            from the email instead, or send a new one.
          </Notice>
        )}
        {authConfigured ? (
          <EmailCodeForm
            title={c.title}
            intro={c.intro}
            onSendCode={(email) => sendSignInCode(email, next)}
            onVerifyCode={verifySignInCode}
            footer={
              <>
                {c.switchText}{' '}
                <Link href={`${c.switchTo}?next=${encodeURIComponent(next)}`}>{c.switchLabel}</Link>
              </>
            }
          />
        ) : (
          <Notice tone="neutral" icon="error" title="Sign-in isn’t available right now.">
            You can still browse mentors. <Link href="/explore">Go to Explore</Link>
          </Notice>
        )}
      </div>
    </main>
  );
}
