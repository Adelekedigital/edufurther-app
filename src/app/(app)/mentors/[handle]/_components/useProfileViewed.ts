'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { takeProfileSource } from '@/lib/analytics/profileSource';
import { track } from '@/lib/analytics/track';
import { recordProfileVisit } from '@/lib/api/data/profileLinks';
import { VIA_PARAM } from '@/lib/utils/mentorPath';
import { referralHost } from '@/lib/utils/ownHost';

/**
 * `document.referrer` belongs to the page load, not to each profile opened in
 * it: it is offered once, then never again until the next load.
 */
let referrerOffered = false;

/** The path the browser itself loaded (after any redirect), or null when it can't say. */
function loadedPath(): string | null {
  try {
    const nav = performance.getEntriesByType?.('navigation')[0];
    return nav?.name ? new URL(nav.name).pathname : null;
  } catch {
    return null;
  }
}

/**
 * The host of the outside page that sent the visitor to this profile, bare;
 * undefined otherwise. Only for the first profile counted on this page load,
 * and only when this profile is the page the browser loaded: one opened later
 * by a click inside the app was not referred by whoever sent the first.
 */
export function referrerHost(): string | undefined {
  if (referrerOffered) return undefined;
  referrerOffered = true;
  try {
    if (!document.referrer) return undefined;
    const loaded = loadedPath();
    if (loaded !== null && loaded !== window.location.pathname) return undefined;
    // Ours, or a sign-in step (Google, our auth host): never a referral.
    return referralHost(document.referrer, window.location.hostname);
  } catch {
    return undefined;
  }
}

/**
 * The mentors whose visit this page load recorded, and when. Memory only:
 * nothing goes on the device before consent (owner, 2026-11-10).
 */
const seen = new Map<string, number>();
/** Long enough to cover a round trip through sign-in by the email code. */
export const SEEN_MS = 30 * 60_000;

/**
 * True when this page load recorded a visit to `id` in the last SEEN_MS, else
 * notes it now: back to the profile after the email code, or by Back, is the
 * same visit.
 * Accepted: a Google sign-in returns on a fresh load, so may count one extra (signed-in) visit, never with a referrer.
 */
function seenRecently(id: string, now = Date.now()): boolean {
  const at = seen.get(id);
  if (at !== undefined && now - at < SEEN_MS) return true;
  seen.set(id, now);
  return false;
}

/**
 * The channel has been read: `via` leaves the address bar, without a
 * navigation, so a re-share or a bookmark of this page doesn't carry it.
 */
function dropVia() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(VIA_PARAM)) return;
  url.searchParams.delete(VIA_PARAM);
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

type View = {
  /** The profile has loaded and who is looking is known. */
  loaded: boolean;
  /** Someone other than its owner: only their look is a visit. */
  visitor: boolean;
  mentorId?: string;
};

/**
 * `mentor_profile_viewed` (PRD 30), once per visit to a handle: when the
 * profile has loaded for someone other than its owner. Keyed by the handle,
 * so a tab switch (`?tab=`) or StrictMode's second effect never counts again,
 * and a similar mentor opened from here counts as their own visit. `mentorId`
 * lets a source noted on an id link count after the 308 to the slug.
 *
 * The same visit goes to our own database (recordProfileVisit), with the
 * link's `?via=` and an outside referrer's host, unless this page load recorded it
 * lately; a preview sends nothing. `via` leaves the address bar once the
 * profile has loaded, for the owner too.
 */
export function useProfileViewed(handle: string, { loaded, visitor, mentorId }: View) {
  const params = useSearchParams();
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (visitor && counted.current !== handle) {
      counted.current = handle;
      const search = new URLSearchParams(params.toString());
      const source = takeProfileSource([handle, mentorId], search);
      track('mentor_profile_viewed', { source });
      const id = mentorId ?? handle;
      // Taken even when this visit isn't sent, so no later profile inherits it.
      const from = referrerHost();
      if (!seenRecently(id))
        recordProfileVisit(id, { via: search.get(VIA_PARAM), referrerHost: from });
    }
    dropVia();
  }, [loaded, visitor, handle, mentorId, params]);
}

/** Tests only: a fresh page load. */
export function resetProfileVisitsForTests() {
  referrerOffered = false;
  seen.clear();
}
