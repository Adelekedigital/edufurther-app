'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { takeProfileSource } from '@/lib/analytics/profileSource';
import { track } from '@/lib/analytics/track';

/**
 * `mentor_profile_viewed` (PRD 30), once per visit to a handle: when the
 * profile has loaded for someone other than its owner. Keyed by the handle,
 * so a tab switch (`?tab=`) or StrictMode's second effect never counts again,
 * and a similar mentor opened from here counts as their own visit. `mentorId`
 * lets a source noted on an id link count after the 308 to the slug.
 */
export function useProfileViewed(handle: string, ready: boolean, mentorId?: string) {
  const params = useSearchParams();
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || counted.current === handle) return;
    counted.current = handle;
    const source = takeProfileSource([handle, mentorId], new URLSearchParams(params.toString()));
    track('mentor_profile_viewed', { source });
  }, [ready, handle, mentorId, params]);
}
