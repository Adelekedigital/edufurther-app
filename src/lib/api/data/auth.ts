'use client';

import { useCallback } from 'react';
import { hardNavigate } from '@/lib/utils/hardNavigate';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { sendEmailCode, signOut, verifyEmailCode } from '@/lib/vendor/supabase/browser';
import { authConfigured } from '@/lib/vendor/supabase/config';
import { beginSignOut } from './session';

export { authConfigured };
export type { AuthFailure } from '@/lib/vendor/supabase/browser';

/**
 * Email a sign-in code. The same email carries a magic link that lands on
 * /auth/callback and then `next` (a local path only).
 */
export function sendSignInCode(email: string, next: string) {
  const back = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeReturnTo(next))}`;
  return sendEmailCode(email, back);
}

export const verifySignInCode = verifyEmailCode;

/**
 * Logout (product, 2026-09-30): end the session, then a full load of /login.
 * - The screen is frozen first (beginSignOut), so it isn't redrawn signed out
 *   or loading in the moment before /login replaces it.
 * - The session ends before navigating: /login sends a signed-in visitor on.
 * - No cache clearing: the full load discards everything this page held.
 * - /login loads even if signing out throws (signOut clears this device's
 *   cookies itself when the SDK can't).
 */
export function useSignOut() {
  return useCallback(async () => {
    beginSignOut();
    try {
      await signOut();
    } finally {
      hardNavigate('/login');
    }
  }, []);
}
