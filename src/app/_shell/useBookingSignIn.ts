'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GuestPick, GuestSignIn, GuestStage } from '@/components/organisms/BookingFlow/types';
import { loadAccount, toAccount } from '@/app/_auth/account';
import { useEmailCodeAuth } from '@/app/_auth/useEmailCodeAuth';
import { startGoogleSignIn } from '@/lib/api/data/auth';
import { useSaveName, zoneToSave } from '@/lib/api/data/signIn';
import { ONBOARDING_LIVE, newAccountDestination } from '@/lib/config/auth';
import { rememberSignInMethod } from '@/lib/utils/lastUsed';
import { useOnline } from '@/lib/utils/useOnline';
import { profileHandle } from '@/lib/utils/guestBooking';

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
 */
export function useBookingSignIn({ profileHref }: { profileHref: string }): GuestSignIn {
  const router = useRouter();
  const online = useOnline();
  const saveName = useSaveName();
  const [stage, setStage] = useState<GuestStage>('email');
  const [error, setError] = useState<GuestSignIn['error']>();
  const [googleBusy, setGoogleBusy] = useState(false);
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

  // Back from Google (bfcache restores the busy button): let it be pressed again.
  useEffect(() => {
    const clear = () => setGoogleBusy(false);
    window.addEventListener('pageshow', clear);
    return () => window.removeEventListener('pageshow', clear);
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
    googleBusy,
    onSendCode: () => {
      setError(undefined);
      void auth.send().then((sent) => {
        if (sent === 'sent') setStage('code');
        else if (sent === 'offline') setError('sendFailed');
        else if (sent === 'failed') setError('sendUnavailable');
      });
    },
    onGoogle: (pick) => {
      setGoogleBusy(true);
      setError(undefined);
      void startGoogleSignIn(bookingReturnPath(profileHref, pick), 'signup', 'mentee').then((r) => {
        // Success: the browser is already leaving for Google, so stay busy.
        if (r.ok) return;
        setGoogleBusy(false);
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
        .then(() => {
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
