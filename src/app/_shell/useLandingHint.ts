'use client';

import { useEffect } from 'react';
import { memberHome, viewerRole } from '@/lib/utils/access';
import { LANDING_COOKIE, LANDING_MAX_AGE, encodeLanding } from '@/lib/utils/landingHint';
import type { Viewer } from '@/types/mentor';

/**
 * Keeps the landing hint (lib/utils/landingHint) in step with who is signed
 * in: a mentor-side member's own home, written once /me answers; cleared for
 * a mentee, so a role change never sends them anywhere. Left alone while /me
 * loads or fails, and for guests (the proxy ignores it without a session).
 */
export function useLandingHint(viewer: Viewer): void {
  const value =
    viewer.kind === 'member'
      ? viewerRole(viewer) === 'mentor'
        ? encodeLanding(viewer.id, memberHome(viewer))
        : ''
      : null;
  useEffect(() => {
    if (value === null) return;
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = value
      ? `${LANDING_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${LANDING_MAX_AGE}; samesite=lax${secure}`
      : `${LANDING_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
  }, [value]);
}
