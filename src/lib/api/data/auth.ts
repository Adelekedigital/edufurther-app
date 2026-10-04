'use client';

import { useCallback } from 'react';
import { hardNavigate } from '@/lib/utils/hardNavigate';
import { releaseLeaveGuards } from '@/lib/utils/leaveGuard';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import {
  sendEmailCode,
  signInWithGoogle,
  signOut,
  verifyEmailCode,
} from '@/lib/vendor/supabase/browser';
import { authConfigured } from '@/lib/vendor/supabase/config';
import { beginSignOut } from './session';

export { authConfigured };
export type { AuthFailure } from '@/lib/vendor/supabase/browser';

/**
 * Email a sign-in code. The same email carries a magic link that lands on
 * /auth/callback and then `next` (a local path only).
 */
export function sendSignInCode(email: string, next: string) {
  return sendEmailCode(email, callbackUrl(next));
}

/** Where Supabase sends the browser back to. Local paths only (safeReturnTo). */
function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnTo(next))}`;
}

export const verifySignInCode = verifyEmailCode;

/**
 * Start Google sign-in. Same landing as the email link, so `next` survives the
 * round trip through Google and Supabase.
 */
export function startGoogleSignIn(next: string) {
  return signInWithGoogle(callbackUrl(next));
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
    hardNavigate('/login');
  }, []);
}
