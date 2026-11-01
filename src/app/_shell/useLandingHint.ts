'use client';

import { useEffect } from 'react';
import { saveLandingHint } from '@/lib/api/data/landingHint';
import { useSession } from '@/lib/api/data/session';
import { memberHome, viewerRole } from '@/lib/utils/access';
import { CHOSE_EXPLORE_COOKIE, LANDING_PATHS } from '@/lib/utils/landingHint';
import type { Viewer } from '@/types/mentor';

/**
 * The mentor landing hint (lib/utils/landingHint) for this viewer: a
 * mentor-side member's own home once /me answers; null (clear) for a mentee
 * and for an account that can't be used (unlinked, accountExists), so
 * Explore's notices still reach them; undefined (leave it) while /me loads or
 * failed, and for guests, whom the proxy never redirects.
 */
export function landingHintFor(viewer: Viewer): string | null | undefined {
  if (viewer.kind === 'member') return viewerRole(viewer) === 'mentor' ? memberHome(viewer) : null;
  if (viewer.kind === 'unlinked' || viewer.kind === 'accountExists') return null;
  return undefined;
}

/**
 * Keeps the hint in step with who is signed in (the server sets it), and
 * marks Explore as chosen once a mentor has it on screen (CHOSE_EXPLORE_COOKIE).
 * Nothing in mock mode, which has no session to bind a hint to.
 */
export function useLandingHint(viewer: Viewer, pathname: string | null): void {
  const session = useSession();
  const userId = session.status === 'present' ? session.userId : null;
  const hint = landingHintFor(viewer);
  const choseAs =
    viewer.kind === 'member' && !!hint && !!pathname && LANDING_PATHS.has(pathname) ? userId : null;
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MOCK_VIEWER || !userId || hint === undefined) return;
    saveLandingHint(userId, hint);
  }, [userId, hint]);
  useEffect(() => {
    // A browser-session cookie (no Max-Age), bound to this Supabase user.
    if (choseAs)
      document.cookie = `${CHOSE_EXPLORE_COOKIE}=${encodeURIComponent(choseAs)}; path=/; samesite=lax`;
  }, [choseAs]);
}
