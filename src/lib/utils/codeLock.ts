import { normaliseEmail } from './emailTypo';

/**
 * Wrong-code count and the 15-minute lock, kept on screen (PRD: code rules).
 * Supabase doesn't count misses per code; its per-IP verify limit is the real
 * guard, and a server-side lock is backend issue edufurtherbe#475. This only
 * tells the person where they stand, and survives a reload of the tab.
 *
 * One entry per address, in sessionStorage, keyed by a hash of the normalised
 * address rather than the address itself (it keeps the address out of storage
 * at a glance; a 32-bit hash is no secret). Storage can be missing or throw
 * (private mode, blocked site data, full); then the count lives for this page
 * only, which is still honest.
 */
export const MAX_TRIES = 5;
export const LOCK_MS = 15 * 60 * 1000;

const KEY = 'ef-code-tries';

type Entry = { misses: number; lockedUntil: number | null };
type Entries = Record<string, Entry>;

let memory: Entries = {};
/** Whether the last save reached storage; if not, this page's copy is the truth. */
let saved = true;

/** FNV-1a: enough to tell two addresses apart without writing either down. */
function hash(email: string): string {
  const s = normaliseEmail(email);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function read(): Entries {
  try {
    if (saved) {
      const raw = window.sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Entries) : {};
    }
  } catch {
    // Fall through to this page's copy.
  }
  return memory;
}

/** Drops lifted locks and spent entries, then saves; a failed save leaves no stale copy behind. */
function write(entries: Entries, now: number) {
  const kept: Entries = {};
  for (const [k, e] of Object.entries(entries)) {
    if (e.misses > 0 && (e.lockedUntil === null || e.lockedUntil > now)) kept[k] = e;
  }
  memory = kept;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(kept));
    saved = true;
  } catch {
    saved = false;
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      // This page's copy is enough.
    }
  }
}

export type CodeTries = { triesLeft: number; lockedUntil: number | null };

const FRESH: CodeTries = { triesLeft: MAX_TRIES, lockedUntil: null };

/** Where this address stands now. A lock that has run out reads as a fresh start. Never writes. */
export function codeTries(email: string, now = Date.now()): CodeTries {
  const e = read()[hash(email)];
  if (!e || (e.lockedUntil !== null && e.lockedUntil <= now)) return FRESH;
  return { triesLeft: Math.max(0, MAX_TRIES - e.misses), lockedUntil: e.lockedUntil };
}

/** A wrong code. The fifth locks the address for 15 minutes. */
export function recordMiss(email: string, now = Date.now()): CodeTries {
  const current = codeTries(email, now);
  if (current.lockedUntil !== null) return current;
  const misses = MAX_TRIES - current.triesLeft + 1;
  const lockedUntil = misses >= MAX_TRIES ? now + LOCK_MS : null;
  write({ ...read(), [hash(email)]: { misses, lockedUntil } }, now);
  return { triesLeft: Math.max(0, MAX_TRIES - misses), lockedUntil };
}

/** A new code was sent, or the code worked: this address's count starts again. Never lifts a lock. */
export function resetTries(email: string, now = Date.now()) {
  if (codeTries(email, now).lockedUntil !== null) return;
  const { [hash(email)]: _dropped, ...others } = read();
  write(others, now);
}
