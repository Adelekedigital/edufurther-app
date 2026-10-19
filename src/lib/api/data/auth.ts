'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { hardNavigate } from '@/lib/utils/hardNavigate';
import { releaseLeaveGuards } from '@/lib/utils/leaveGuard';
import { normaliseEmail } from '@/lib/utils/emailTypo';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import {
  endSessionHere,
  sendEmailCode,
  signedInUser,
  signInWithGoogle,
  signOut,
  verifyEmailCode,
} from '@/lib/vendor/supabase/browser';
import { authConfigured } from '@/lib/vendor/supabase/config';
import { beginSignOut } from './session';
import { clearAllBookingDrafts } from '@/lib/utils/bookingDraft';

export { authConfigured, signedInUser };
export type { AuthFailure, SignedInUser } from '@/lib/vendor/supabase/browser';

export type SignInMode = 'login' | 'signup';
export type SignInRole = 'mentee' | 'mentor';

/**
 * Where Supabase sends the browser back to. Local paths only (safeReturnTo).
 * `from` tells the callback which way in this was: it cannot tell from the
 * error codes, which overlap between a cancelled Google sign-in and a dead
 * email link. `mode` and `role` bring a Google sign-in back to the screen it
 * started on, so a mentor sign-up finishes as one.
 */
function callbackUrl(next: string | null, from?: 'google', mode?: SignInMode, role?: SignInRole) {
  const q = new URLSearchParams();
  if (next) q.set('next', safeReturnTo(next));
  if (from) q.set('from', from);
  if (mode === 'signup') q.set('mode', 'signup');
  if (role === 'mentor') q.set('role', 'mentor');
  const query = q.toString();
  return `${window.location.origin}/auth/callback${query ? `?${query}` : ''}`;
}

/** Email a 6-digit code to the address, trimmed and lowercased. */
export function sendSignInCode(email: string, next: string | null) {
  return sendEmailCode(normaliseEmail(email), callbackUrl(next));
}

export function verifySignInCode(email: string, code: string) {
  return verifyEmailCode(normaliseEmail(email), code);
}

/** Start Google sign-in; the callback brings the browser back to this screen. */
export function startGoogleSignIn(next: string | null, mode: SignInMode, role: SignInRole) {
  return signInWithGoogle(callbackUrl(next, 'google', mode, role));
}

/**
 * Logout (product, 2026-09-30): end the session, then a full load of /login.
 * - The screen is frozen first (beginSignOut), so it isn't redrawn signed out
 *   or loading in the moment before /login replaces it.
 * - The session ends before navigating: /login sends a signed-in visitor on.
 * - No cache clearing: the full load discards everything this page held.
 * - /login loads even if signing out fails or stalls (signOut clears this
 *   device's cookies itself when the SDK can't, or after 3 s).
 * - Forms' "Leave site?" prompt is released: the user already chose to leave.
 */
export function useSignOut() {
  return useCallback(async () => {
    beginSignOut();
    // Unsaved changes were confirmed away already (useAppShell asks first).
    releaseLeaveGuards();
    try {
      await signOut();
    } catch {
      // signOut clears this device's cookies itself; nothing to add here.
    }
    // A booking draft's answers can be personal: none stays in the tab.
    clearAllBookingDrafts();
    hardNavigate('/login');
  }, []);
}

/**
 * Sign out of this device and stay on the page: the sign-in screen's way out
 * of a session that has no named account behind it. The cache goes with the
 * session, as it was keyed by it. Resolves false when the session stayed.
 */
export function useSignOutHere() {
  const qc = useQueryClient();
  return useCallback(async () => {
    const ended = await endSessionHere().catch(() => false);
    if (ended) {
      qc.clear();
      clearAllBookingDrafts();
    }
    return ended;
  }, [qc]);
}
