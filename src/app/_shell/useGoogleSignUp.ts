'use client';

import { useCallback, useEffect, useState } from 'react';
import { startGoogleSignIn } from '@/lib/api/data/auth';

/**
 * "Continue with Google" as a mentee sign-up that comes back to `next` (the
 * booking modal, the profile's review gate). Busy from the press until the
 * browser leaves for Google; `failed` when it couldn't start. `next` is
 * checked by the callback URL (`safeReturnTo`), so only a path on this site
 * comes back.
 */
export function useGoogleSignUp() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Back from Google (bfcache restores the busy button): let it be pressed again.
  useEffect(() => {
    const clear = () => setBusy(false);
    window.addEventListener('pageshow', clear);
    return () => window.removeEventListener('pageshow', clear);
  }, []);

  const start = useCallback((next: string, onFailed?: () => void) => {
    setBusy(true);
    setFailed(false);
    void startGoogleSignIn(next, 'signup', 'mentee').then((r) => {
      // Success: the browser is already leaving for Google, so stay busy.
      if (r.ok) return;
      setBusy(false);
      setFailed(true);
      onFailed?.();
    });
  }, []);

  return { busy, failed, start };
}
