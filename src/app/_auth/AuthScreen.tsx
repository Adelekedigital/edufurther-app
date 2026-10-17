'use client';

import Link from 'next/link';
import { Notice } from '@/components/molecules/Notice/Notice';
import { Toast } from '@/components/molecules/Toast/Toast';
import { SignInForm } from '@/components/organisms/SignInForm/SignInForm';
import { authConfigured, type SignInMode, type SignInRole } from '@/lib/api/data/auth';
import { useSignInFlow } from './useSignInFlow';
import styles from './AuthScreen.module.css';

type AuthScreenProps = {
  mode: SignInMode;
  /** Sign-up only: `/signup?role=mentor`. */
  role: SignInRole;
  /** Where to go once signed in (already checked by safeReturnTo), or null for the account's home. */
  next: string | null;
  /** Back from Google: with a session, finish here; without, say so. */
  google?: 'returned' | 'failed';
};

/** A link to another sign-in page that keeps `next`. */
function withNext(path: string, next: string | null) {
  if (!next) return path;
  return `${path}${path.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}`;
}

/**
 * /login and /signup, for mentees and mentors (Sign In.dc.html). The page
 * runs the flow; SignInForm draws it; the toast names the outcome before the
 * redirect (`afterAuth=toast`).
 */
export function AuthScreen({ mode, role, next, google }: AuthScreenProps) {
  const { form, toast } = useSignInFlow({
    mode,
    role,
    next,
    googleReturn: google === 'returned',
    googleFailed: google === 'failed',
  });

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        {authConfigured ? (
          <SignInForm
            {...form}
            switchHref={withNext(mode === 'signup' ? '/login' : '/signup', next)}
            roleHref={withNext(role === 'mentor' ? '/signup' : '/signup?role=mentor', next)}
          />
        ) : (
          <Notice tone="neutral" icon="error" title="Sign-in isn’t available right now.">
            You can still browse mentors. <Link href="/explore">Go to Explore</Link>
          </Notice>
        )}
      </div>
      <Toast open={!!toast} icon={toast?.icon ?? 'login'} title={toast?.title ?? ''}>
        {toast?.body}
      </Toast>
    </main>
  );
}
