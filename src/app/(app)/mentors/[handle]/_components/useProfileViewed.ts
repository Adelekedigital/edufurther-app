'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { takeProfileSource } from '@/lib/analytics/profileSource';
import { track } from '@/lib/analytics/track';
import { recordProfileVisit } from '@/lib/api/data/profileLinks';
import { VIA_PARAM } from '@/lib/utils/mentorPath';

/**
 * The host of the page that sent the visitor here, bare, or undefined when
 * there was none or it was this app: a navigation within the app is not a
 * referral.
 */
export function referrerHost(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const from = new URL(document.referrer);
    return from.origin === window.location.origin ? undefined : from.hostname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The channel has been counted: `via` leaves the address bar, without a
 * navigation, so a re-share or a bookmark of this page doesn't carry it.
 */
function dropVia() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(VIA_PARAM)) return;
  url.searchParams.delete(VIA_PARAM);
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

/**
 * `mentor_profile_viewed` (PRD 30), once per visit to a handle: when the
 * profile has loaded for someone other than its owner. Keyed by the handle,
 * so a tab switch (`?tab=`) or StrictMode's second effect never counts again,
 * and a similar mentor opened from here counts as their own visit. `mentorId`
 * lets a source noted on an id link count after the 308 to the slug.
 *
 * The same visit goes to our own database (recordProfileVisit), with the
 * link's `?via=` and an outside referrer's host; a preview sends nothing.
 */
export function useProfileViewed(handle: string, ready: boolean, mentorId?: string) {
  const params = useSearchParams();
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || counted.current === handle) return;
    counted.current = handle;
    const search = new URLSearchParams(params.toString());
    const source = takeProfileSource([handle, mentorId], search);
    track('mentor_profile_viewed', { source });
    recordProfileVisit(mentorId ?? handle, {
      via: search.get(VIA_PARAM),
      referrerHost: referrerHost(),
    });
    dropVia();
  }, [ready, handle, mentorId, params]);
}
