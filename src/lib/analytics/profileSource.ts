import type { MouseEvent } from 'react';
import { safeDecode } from '@/lib/utils/text';
import type { ProfileViewSource } from './events';

/**
 * Where a mentor profile visit came from (`mentor_profile_viewed.source`).
 * The surface that links to a profile notes its source on the click; the
 * profile screen takes it once, on arrival. Memory only (this tab): a link
 * opened in a new tab, or a reload, starts with nothing noted and counts as
 * `direct` (or `invite_link`, from the URL).
 */

type Noted = { handle: string; source: ProfileViewSource; at: number };

/**
 * A note is for the navigation its click started: older than this, it was
 * never taken (a link that didn't navigate, a profile that failed to load)
 * and a later visit is not its.
 */
export const NOTE_TTL_MS = 10_000;

let noted: Noted | null = null;

/** The profile a link points at ("/mentors/chidi-n?tab=reviews" → "chidi-n"), or null. */
function profileOf(href: string | null | undefined): string | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const m = /^\/mentors\/([^/]+)\/?$/.exec(url.pathname);
  return m ? safeDecode(m[1]!) : null;
}

/** A link to a profile is being followed from `source`. Anything else is ignored. */
export function noteProfileSource(source: ProfileViewSource, href: string | null | undefined) {
  const handle = profileOf(href);
  if (handle) noted = { handle, source, at: Date.now() };
}

/**
 * For a region whose profile links are drawn by shared organisms (cards,
 * lists): its `onClickCapture` notes `source` for any profile link followed
 * inside it, without each card knowing what page it is on. A click that opens
 * a new tab or window is left alone (that tab has its own memory).
 */
export function profileLinkSource(source: ProfileViewSource) {
  return (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href]');
    if (!a) return;
    const target = a.getAttribute('target');
    if (target && target !== '_self') return;
    noteProfileSource(source, a.getAttribute('href'));
  };
}

/**
 * The URL says the visitor came from a shared or invite link. Only a
 * parameter's presence is read, never its value (an invite code stays out of
 * every event).
 */
const INVITE_PARAMS = ['ref', 'invite'];

/**
 * The source of this visit to `handle`, taken once: what the link noted when
 * it was for this profile and recent, else `invite_link` when the URL carries an invite
 * or referral, else `direct`. Whatever was noted is cleared either way.
 */
export function takeProfileSource(handle: string, search: URLSearchParams): ProfileViewSource {
  const n = noted;
  noted = null;
  if (n && n.handle === handle && Date.now() - n.at <= NOTE_TTL_MS) return n.source;
  return INVITE_PARAMS.some((p) => search.has(p)) ? 'invite_link' : 'direct';
}

/** Tests only: nothing noted. */
export function resetProfileSourceForTests() {
  noted = null;
}
