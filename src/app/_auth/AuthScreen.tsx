'use client';

import Link from 'next/link';
import { useRef, useSyncExternalStore } from 'react';
import { Notice } from '@/components/molecules/Notice/Notice';
import { SignInContext } from '@/components/molecules/SignInContext/SignInContext';
import { Toast } from '@/components/molecules/Toast/Toast';
import { SignInForm } from '@/components/organisms/SignInForm';
import {
  authConfigured,
  takeAccountDeleted,
  type SignInMode,
  type SignInRole,
} from '@/lib/api/data/auth';
import { SECURITY_COPY } from '@/lib/copy/settings';
import { useBookingContext } from './useBookingContext';
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
  /**
   * `/login?deleted=1`: say how to restore the account, but only in the tab
   * that deleted it (a one-shot flag), so a shared link can't claim it.
   */
  deleted?: boolean;
};

const noSubscribe = () => () => {};

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
export function AuthScreen({ mode, role, next, google, deleted = false }: AuthScreenProps) {
  // The one-shot flag lives in sessionStorage: false on the server, read once
  // on the client after hydration, and kept, since reading it clears it.
  const taken = useRef<boolean | null>(null);
  const deletedHere = useSyncExternalStore(
    noSubscribe,
    () => (taken.current ??= deleted && takeAccountDeleted()),
    () => false,
  );
  const booking = useBookingContext(next);
  const { form, toast } = useSignInFlow({
    mode,
    role,
    next,
    bookingWith: booking?.firstName ?? null,
    googleReturn: google === 'returned',
    googleFailed: google === 'failed',
  });

  return (
    <main className={styles.page}>
      {/* Heard: the region is in the page from the first paint (empty on the
          server), and the notice's words arrive once the tab's flag is read. */}
      <p role="status" className="sr-only">
        {deletedHere ? SECURITY_COPY.deletedNotice : ''}
      </p>
      <div className={styles.wrap}>
        {authConfigured ? (
          <SignInForm
            {...form}
            switchHref={withNext(mode === 'signup' ? '/login' : '/signup', next)}
            roleHref={withNext(role === 'mentor' ? '/signup' : '/signup?role=mentor', next)}
            // The design shows it on the mentee pages only (`!mentor`).
            context={
              // PROVISIONAL (not in a design file yet; listed for design): the
              // notice pattern the page already uses, where the booking line sits.
              deletedHere ? (
                <Notice tone="neutral" icon="info" live={false}>
                  {SECURITY_COPY.deletedNotice}
                </Notice>
              ) : booking && role !== 'mentor' ? (
                <SignInContext
                  initials={booking.initials}
                  tone={booking.cover}
                  photoUrl={booking.photoUrl}
                  photoFocus={booking.photoFocus}
                >
                  {/* "Gbenga E." already ends the sentence: no second full stop. */}
                  Log in or sign up to finish booking {booking.mentorName}
                  {booking.mentorName.endsWith('.') ? '' : '.'}
                </SignInContext>
              ) : undefined
            }
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
