/**
 * Wrong-code count and the 15-minute lock, kept on screen (PRD: code rules).
 * Supabase doesn't count misses per code; its per-IP verify limit is the real
 * guard, and a server-side lock is backend issue edufurtherbe#475. This only
 * tells the person where they stand, and survives a reload of the tab.
 *
 * Stored in sessionStorage under a hash of the address, never the address
 * itself. Storage can be missing or throw (private mode, blocked site data);
 * then the count lives for this page only, which is still honest.
 */
export const MAX_TRIES = 5;
export const LOCK_MS = 15 * 60 * 1000;

const KEY = 'ef-code-tries';

type Entry = { who: string; misses: number; lockedUntil: number | null };

let memory: Entry | null = null;

/** FNV-1a: enough to tell two addresses apart without storing either. */
function hash(email: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < email.length; i++) {
    h ^= email.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function read(): Entry | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Entry;
  } catch {
    // Fall through to this page's copy.
  }
  return memory;
}

function write(entry: Entry | null) {
  memory = entry;
  try {
    if (entry) window.sessionStorage.setItem(KEY, JSON.stringify(entry));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // This page's copy is enough.
  }
}

export type CodeTries = { triesLeft: number; lockedUntil: number | null };

/** Where this address stands now. An expired lock reads as a fresh start. */
export function codeTries(email: string, now = Date.now()): CodeTries {
  const e = read();
  if (!e || e.who !== hash(email)) return { triesLeft: MAX_TRIES, lockedUntil: null };
  if (e.lockedUntil !== null && e.lockedUntil <= now) {
    write(null);
    return { triesLeft: MAX_TRIES, lockedUntil: null };
  }
  return { triesLeft: Math.max(0, MAX_TRIES - e.misses), lockedUntil: e.lockedUntil };
}

/** A wrong code. The fifth locks the address for 15 minutes. */
export function recordMiss(email: string, now = Date.now()): CodeTries {
  const current = codeTries(email, now);
  if (current.lockedUntil !== null) return current;
  const misses = MAX_TRIES - current.triesLeft + 1;
  const lockedUntil = misses >= MAX_TRIES ? now + LOCK_MS : null;
  write({ who: hash(email), misses, lockedUntil });
  return { triesLeft: Math.max(0, MAX_TRIES - misses), lockedUntil };
}

/** A new code was sent, or the code worked: the count starts again. Never lifts a lock. */
export function resetTries(email: string, now = Date.now()) {
  if (codeTries(email, now).lockedUntil !== null) return;
  write(null);
}
