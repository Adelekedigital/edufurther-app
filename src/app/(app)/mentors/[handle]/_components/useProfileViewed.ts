'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { takeProfileSource } from '@/lib/analytics/profileSource';
import { track } from '@/lib/analytics/track';

/**
 * `mentor_profile_viewed` (PRD 30), once per visit to a handle: when the
 * profile has loaded for someone other than its owner. Keyed by the handle,
 * so a tab switch (`?tab=`) or StrictMode's second effect never counts again,
 * and a similar mentor opened from here counts as their own visit.
 */
export function useProfileViewed(handle: string, ready: boolean) {
  const params = useSearchParams();
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || counted.current === handle) return;
    counted.current = handle;
    const source = takeProfileSource(handle, new URLSearchParams(params.toString()));
    track('mentor_profile_viewed', { source });
  }, [ready, handle, params]);
}
