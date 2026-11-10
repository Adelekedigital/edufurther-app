'use client';

import { useCallback, useRef } from 'react';
import type { Role } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

/**
 * `signup_started` (PRD 30), the sign-up funnel's first step: the first try to
 * get in (a code asked for, or Google) on this visit, from /signup or the
 * booking modal's guest step. Returns the call to make on each try; only the
 * first sends. `role` is what the visitor is signing up as, when known.
 */
export function useSignupStarted(role?: Role): () => void {
  const sent = useRef(false);
  return useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    track('signup_started', role ? { role } : {});
  }, [role]);
}
