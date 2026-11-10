'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { GuestPick, GuestSignIn, GuestStage } from '@/components/organisms/BookingFlow/types';
import { loadAccount, toAccount } from '@/app/_auth/account';
import { useEmailCodeAuth } from '@/app/_auth/useEmailCodeAuth';
import { claimInvite } from '@/lib/api/data/invite';
import { useSaveName, zoneToSave } from '@/lib/api/data/signIn';
import { ONBOARDING_LIVE, newAccountDestination } from '@/lib/config/auth';
import { clearInviteCode, storedInviteCode } from '@/lib/utils/inviteCode';
import { rememberSignInMethod } from '@/lib/utils/lastUsed';
import { useOnline } from '@/lib/utils/useOnline';
import { profileHandle } from '@/lib/utils/guestBooking';
import { cancelHandOff, handOffBooking } from '@/lib/analytics/bookingHandOff';
import { useSignupStarted } from '@/app/_auth/useSignupStarted';
import { useGoogleSignUp } from './useGoogleSignUp';

/**
 * The profile's own "reopen the booking" link (useBookLink): Google leaves the
 * page, and this is where its return lands, with the modal open at the time.
 */
export function bookingReturnPath(profileHref: string, pick: GuestPick): string {
  const q = new URLSearchParams({ book: pick.sessionTypeId, at: pick.time });
  return `${profileHref}?${q}`;
}

/** The mentor's handle, as the onboarding hand-off names them (`for`); shared with Finish setup. */
const handleOf = (profileHref: string): string => profileHandle(profileHref) ?? '';

/**
 * Signing in inside the booking modal (BookingModal.dc.html, guest step).
 * An existing account carries on with the booking in the modal. A new account
 * is named here, then goes to onboarding with the booking when onboarding is
 * on (`guestSetup=full`), or carries on in the modal when it is off. Google
 * leaves the page and comes back to the profile with the modal reopened.
 * A new account named here claims the invite this device arrived with, as
 * /signup does (PRD Invite Landing); Google's return already goes through
 * /signup, which claims there.
 */
export function useBookingSignIn({ profileHref }: { profileHref: string }): GuestSignIn {
  const router = useRouter();
  const qc = useQueryClient();
  const online = useOnline();
  const saveName = useSaveName();
  const [stage, setStage] = useState<GuestStage>('email');
  const [error, setError] = useState<GuestSignIn['error']>();
  const google = useGoogleSignUp();
  // A guest signing in here may be signing up (PRD 30): counted once, as /signup does.
  const signupStarted = useSignupStarted('mentee');
  const [fullName, setFullName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [finishing, setFinishing] = useState(false);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const userId = useRef<string | null>(null);
  // The account's `/me` zone: the device's goes with the name only while it's unset or UTC.
  const accountZone = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const auth = useEmailCodeAuth({
    next: null,
    codeShowing: stage === 'code',
    onBanned: () => setStage('suspended'),
    onVerified: async (email) => {
      // Signed in either way: whatever fails from here, the booking carries on.
      try {
        rememberSignInMethod('email');
        const acct = await loadAccount();
        // Closed while the code was checked: nothing on this page to change.
        if (!mounted.current) return;
        // No account behind this sign-in (or one not linked to it): `/` explains it.
        if (acct.kind === 'noAccount') return router.replace('/');
        if (acct.kind === 'member') {
          userId.current = acct.id;
          accountZone.current = acct.timezone;
          if (toAccount(acct).isNew) return setStage('name');
          // Named already: an existing account, which never claims an invite.
          clearInviteCode();
        }
        // A /me that keeps failing: carry on rather than drop the booking. An
        // account left unnamed is asked for its name at the next sign-in.
        setSignedInAs(email.trim().toLowerCase());
        setStage('done');
      } catch {
        if (!mounted.current) return;
        setSignedInAs(email.trim().toLowerCase());
        setStage('done');
      }
    },
  });

  return {
    stage,
    email: auth.email,
    onEmailChange: (v) => {
      auth.setEmail(v);
      setError(undefined);
    },
    sending: auth.sending,
    error,
    googleBusy: google.busy,
    onSendCode: () => {
      signupStarted();
      setError(undefined);
      void auth.send().then((sent) => {
        if (sent === 'sent') setStage('code');
        else if (sent === 'offline') setError('sendFailed');
        else if (sent === 'failed') setError('sendUnavailable');
      });
    },
    onGoogle: (pick) => {
      signupStarted();
      setError(undefined);
      // Off to Google and back: the booking is paused, not abandoned.
      handOffBooking();
      google.start(bookingReturnPath(profileHref, pick), () => {
        cancelHandOff();
        setError('googleError');
      });
    },
    code: auth.code,
    onCodeChange: auth.onCodeChange,
    onVerify: (c) => void auth.verify(c),
    verifying: auth.verifying,
    codeProblem: auth.codeProblem,
    resentCount: auth.resentCount,
    resendIn: auth.resendIn,
    onResend: () => void auth.resend(),
    onUseDifferentEmail: () => {
      setStage('email');
      auth.clearCode();
    },
    fullName,
    onFullNameChange: (v) => {
      setFullName(v);
      setNameError(undefined);
    },
    nameError,
    finishing,
    onFinish: (pick) => {
      const id = userId.current;
      if (!id || finishing) return;
      setFinishing(true);
      setNameError(undefined);
      void saveName
        .mutateAsync({ userId: id, name: { fullName }, timezone: zoneToSave(accountZone.current) })
        .then(async () => {
          await claimStoredInvite(qc);
          if (!ONBOARDING_LIVE) {
            setFinishing(false);
            return setStage('done');
          }
          // guestSetup=full: onboarding asks its questions, then finishes the
          // booking. "Create account" stays busy while the page moves on.
          const booking = {
            handle: handleOf(profileHref),
            sid: pick.sessionTypeId,
            time: pick.time,
          };
          // On to onboarding with the booking: paused, not abandoned.
          handOffBooking();
          router.push(newAccountDestination({ role: 'mentee', booking }));
        })
        .catch((e: Error) => {
          setNameError(e.message);
          setFinishing(false);
        });
    },
    signedInAs,
    offline: !online,
  };
}

/**
 * The invite this device arrived with, claimed by the account just named
 * (issue 281, as useSignInFlow). Quiet: any refusal or failure is ignored and
 * the booking goes on; one attempt, the code is cleared whatever the answer.
 */
async function claimStoredInvite(qc: QueryClient): Promise<void> {
  const code = storedInviteCode();
  if (!code) return;
  try {
    await claimInvite(qc, code);
  } catch {
    // Unknown, claimed, retired, too old, or offline: the booking goes on.
  } finally {
    clearInviteCode();
  }
}
