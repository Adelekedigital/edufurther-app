import { isInviteCode } from '@/lib/utils/inviteCode';

/**
 * Where a visitor came from (PRD 30, Acquisition): read on arrival, held on
 * this device until they are signed in, then sent once to
 * POST /api/v1/me/acquisition (lib/api/data/analyticsConsent). It is the
 * account's attribution, not a tracking identifier: no id, no referrer URL.
 *
 * Every value comes from a link, so none is trusted: a UTM value keeps only
 * letters, digits, `_`, `.` and `-`, at most 64 characters, lower-cased, or is
 * dropped; an invite code must pass the backend's own test (`isInviteCode`).
 */

export type Acquisition = {
  source: 'invite' | 'campaign' | 'referral_site';
  channel?: string;
  referral_code?: string;
};

const KEY = 'ef-acquisition';
/** The accounts this device has already sent for (write-once on the server too). */
const SENT_KEY = 'ef-acquisition-sent';
const MAX_SENT = 10;
/** As long as a remembered invite (INVITE_CODE_TTL_MS): long enough to sign up later. */
const TTL_MS = 30 * 24 * 60 * 60_000;
const MAX_UTM = 64;
const UTM_SAFE = /^[a-z0-9_.-]+$/;

/** An untrusted UTM value, made safe, or undefined. */
export function cleanUtm(raw: string | null | undefined): string | undefined {
  const v = raw?.trim().toLowerCase();
  if (!v || v.length > MAX_UTM || !UTM_SAFE.test(v)) return undefined;
  return v;
}

/** Our own sites' visits are not referrals: the app and the landing site are one journey. */
function isOwnHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'edufurther.org' || h.endsWith('.edufurther.org');
}

/**
 * What this arrival says, or null for a direct visit: an invite path, then
 * campaign tags, then another site linking here.
 */
export function readArrival(
  pathname: string,
  search: string,
  referrer: string,
  ownHost: string,
): Acquisition | null {
  const q = new URLSearchParams(search);
  const channel = cleanUtm(q.get('utm_source'));
  const tagged =
    channel !== undefined ||
    cleanUtm(q.get('utm_medium')) !== undefined ||
    cleanUtm(q.get('utm_campaign')) !== undefined;
  const invite = /^\/invite\/([^/]+)\/?$/.exec(pathname)?.[1];
  const code = invite && isInviteCode(invite) ? invite : undefined;
  if (code) return { source: 'invite', referral_code: code, ...(channel ? { channel } : {}) };
  if (tagged) return { source: 'campaign', ...(channel ? { channel } : {}) };
  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      if (host && host !== ownHost && !isOwnHost(host)) return { source: 'referral_site' };
    } catch {
      // Not a URL: a direct visit.
    }
  }
  return null;
}

type Stored = Acquisition & { at: number };

export function storedAcquisition(now = Date.now()): Acquisition | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored> | null;
    const fresh = typeof v?.at === 'number' && now - v.at >= 0 && now - v.at < TTL_MS;
    const source = v?.source;
    if (fresh && (source === 'invite' || source === 'campaign' || source === 'referral_site')) {
      return {
        source,
        ...(cleanUtm(v?.channel) ? { channel: cleanUtm(v?.channel) } : {}),
        ...(isInviteCode(v?.referral_code) ? { referral_code: v.referral_code } : {}),
      };
    }
    localStorage.removeItem(KEY);
  } catch {
    // Storage off or not ours: nothing held.
  }
  return null;
}

/**
 * Keep an arrival. The first one wins (first touch), except that a later
 * invite adds its code to an earlier campaign or referral visit, since the
 * backend credits the inviter whatever the source says.
 */
export function rememberArrival(a: Acquisition, now = Date.now()): void {
  const held = storedAcquisition(now);
  let next: Acquisition = a;
  if (held) {
    if (held.referral_code || !a.referral_code) return;
    next = { ...held, source: 'invite', referral_code: a.referral_code };
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...next, at: now }));
  } catch {
    // Storage off: the account is recorded as a direct visit.
  }
}

function sentList(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** This device already sent this account's arrival (or the server already had one). */
export function acquisitionSent(userId: string): boolean {
  return sentList().includes(userId);
}

/** Sent: the held arrival is dropped and the account remembered, so it is never sent again here. */
export function markAcquisitionSent(userId: string): void {
  try {
    const list = [userId, ...sentList().filter((x) => x !== userId)].slice(0, MAX_SENT);
    localStorage.setItem(SENT_KEY, JSON.stringify(list));
    localStorage.removeItem(KEY);
  } catch {
    // Storage off: the server's write-once answers 200 to a repeat.
  }
}
