import { isInviteCode } from '@/lib/utils/inviteCode';

/**
 * Where a visitor came from (PRD 30, Acquisition): read on arrival, held
 * until they are signed in, then sent once to
 * POST /api/v1/me/acquisition (lib/api/data/analyticsConsent). It is the
 * account's attribution, not a tracking identifier: no id, no referrer URL.
 *
 * Every value comes from a link, so none is trusted: a UTM value keeps only
 * letters, digits, `_`, `.` and `-`, at most 64 characters, lower-cased, or is
 * dropped; an invite code must pass the backend's own test (`isInviteCode`).
 *
 * Nothing is written to the device before Accept (owner, 2026-11-10): the
 * arrival and the "already sent" list stay in memory (an arrival is lost if
 * the visitor leaves before signing in, accepted), and go to localStorage only
 * once identified (`setAcquisitionPersistence`).
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

let memory: Stored | null = null;
const sentHere = new Set<string>();
let persist = false;

function fresh(v: Partial<Stored> | null, now: number): Acquisition | null {
  const ok = typeof v?.at === 'number' && now - v.at >= 0 && now - v.at < TTL_MS;
  const source = v?.source;
  if (!ok || (source !== 'invite' && source !== 'campaign' && source !== 'referral_site'))
    return null;
  const channel = cleanUtm(v?.channel);
  const code = v?.referral_code;
  return {
    source,
    ...(channel ? { channel } : {}),
    ...(isInviteCode(code) ? { referral_code: code } : {}),
  };
}

function readStored(now: number): Acquisition | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const held = fresh(JSON.parse(raw) as Partial<Stored> | null, now);
    if (!held) localStorage.removeItem(KEY);
    return held;
  } catch {
    // Storage off or not ours: nothing held.
    return null;
  }
}

function writeStored(v: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Storage off: memory only.
  }
}

/** The held arrival: this page's, else one kept from an earlier identified visit. */
export function storedAcquisition(now = Date.now()): Acquisition | null {
  const inMemory = fresh(memory, now);
  if (inMemory) return inMemory;
  memory = null;
  return readStored(now);
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
  memory = { ...next, at: now };
  if (persist) writeStored(memory);
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
  return sentHere.has(userId) || sentList().includes(userId);
}

/** Sent: the held arrival is dropped and the account remembered, so it is never sent again here. */
export function markAcquisitionSent(userId: string): void {
  sentHere.add(userId);
  memory = null;
  try {
    localStorage.removeItem(KEY);
    if (!persist) return;
    const list = [userId, ...sentList().filter((x) => x !== userId)].slice(0, MAX_SENT);
    localStorage.setItem(SENT_KEY, JSON.stringify(list));
  } catch {
    // Storage off: the server's write-once answers 200 to a repeat.
  }
}

/**
 * Identified (after Accept): what memory holds goes to the device too, so a
 * sign-up days later still carries it. Off again (a withdrawal): what was
 * written goes; memory keeps this page's.
 */
export function setAcquisitionPersistence(on: boolean): void {
  if (persist === on) return;
  persist = on;
  try {
    if (on) {
      if (memory) writeStored(memory);
      if (sentHere.size) {
        const list = [...sentHere, ...sentList().filter((x) => !sentHere.has(x))];
        localStorage.setItem(SENT_KEY, JSON.stringify(list.slice(0, MAX_SENT)));
      }
    } else {
      localStorage.removeItem(KEY);
      localStorage.removeItem(SENT_KEY);
    }
  } catch {
    // Storage off: nothing to move.
  }
}

/** Log-out: nothing about who was here stays on the device. */
export function forgetAcquisitionSent(): void {
  sentHere.clear();
  try {
    localStorage.removeItem(SENT_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Tests only. */
export function resetAcquisitionForTests(): void {
  memory = null;
  sentHere.clear();
  persist = false;
}
