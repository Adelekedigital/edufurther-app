'use client';

import { useEffect } from 'react';
import { saveLandingHint } from '@/lib/api/data/landingHint';
import { memberHome, viewerRole } from '@/lib/utils/access';
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

/** Keeps the hint in step with who is signed in (the server sets it). */
export function useLandingHint(viewer: Viewer): void {
  const hint = landingHintFor(viewer);
  useEffect(() => {
    if (hint !== undefined) saveLandingHint(hint);
  }, [hint]);
}
