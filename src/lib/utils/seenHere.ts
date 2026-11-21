/**
 * What this tab's signed-in account has seen in this visit (a What's new
 * release id), kept so a tour never returns before the account's own list
 * says so (lib/api/data/seenItems). Tied to the account: another viewer in the
 * same tab starts empty, and signing out or a session ending clears it, like
 * a booking draft (lib/api/data/auth, http.ts onExpired). No dependencies, so
 * the sign-out paths can import it without a cycle.
 */

export const SEEN_HERE_KEY = 'ef-seen-items';

type Stored = { id: string; keys: string[] };

const EMPTY: ReadonlySet<string> = new Set();
let cache: { id: string; keys: ReadonlySet<string> } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): { id: string; keys: ReadonlySet<string> } | null {
  if (cache) return cache;
  try {
    const v = JSON.parse(sessionStorage.getItem(SEEN_HERE_KEY) ?? 'null') as Partial<Stored> | null;
    if (v && typeof v.id === 'string' && Array.isArray(v.keys))
      cache = { id: v.id, keys: new Set(v.keys.filter((k) => typeof k === 'string')) };
  } catch {
    // Unreadable: nothing kept.
  }
  return cache;
}

/** The keys this viewer has seen here; another viewer's list reads as empty. */
export function seenHere(viewerId: string | null): ReadonlySet<string> {
  const c = load();
  return viewerId && c?.id === viewerId ? c.keys : EMPTY;
}

/** Adds a key for this viewer, replacing any other viewer's list. */
export function addSeenHere(viewerId: string, key: string): void {
  const keys = new Set(seenHere(viewerId));
  keys.add(key);
  cache = { id: viewerId, keys };
  try {
    sessionStorage.setItem(SEEN_HERE_KEY, JSON.stringify({ id: viewerId, keys: [...keys] }));
  } catch {
    // Kept in memory for this tab.
  }
  emit();
}

/** Sign-out and an ended session: the next person here starts with nothing. */
export function clearSeenHere(): void {
  cache = null;
  try {
    sessionStorage.removeItem(SEEN_HERE_KEY);
  } catch {}
  emit();
}

export function subscribeSeenHere(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
