'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { sendEmailCode, signOut, verifyEmailCode } from '@/lib/vendor/supabase/browser';
import { authConfigured } from '@/lib/vendor/supabase/config';
import { keys } from './keys';

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

/** Sign out and drop everything cached for this viewer. */
export function useSignOut() {
  const qc = useQueryClient();
  return useCallback(async () => {
    await signOut();
    qc.removeQueries({ queryKey: keys.viewer.all });
    qc.removeQueries({ queryKey: keys.mentors.all });
  }, [qc]);
}
