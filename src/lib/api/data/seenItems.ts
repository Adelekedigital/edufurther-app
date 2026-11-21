'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { SEEN_KEY } from '@/lib/utils/whatsNew';
import { untyped } from './pending';
import { isPreviewing } from './previewStore';
import { patchViewer } from './viewer';

/**
 * What the account has seen (`/me.seen_items`, PENDING BACKEND): a "What's
 * new" tour's release id once it's dismissed or finished (ADR 0014).
 *
 * Optimistic: the key joins the cached /me and this visit's own list at once,
 * so the tour never comes back in this visit, even if the write fails or a
 * /me refetch lands before it. The write (PUT, idempotent) then retries
 * quietly. Never in Preview as user: the admin didn't see it for them.
 */

/** This tab's visit (sessionStorage), so a reload mid-write doesn't bring it back. */
export const SEEN_HERE_KEY = 'ef-seen-items';
/** Waits before each retry; three tries in all. */
export const RETRY_MS = [2_000, 8_000];

let here: ReadonlySet<string> | null = null;
const listeners = new Set<() => void>();
const EMPTY: ReadonlySet<string> = new Set();

function read(): ReadonlySet<string> {
  if (here) return here;
  let keys: string[] = [];
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(SEEN_HERE_KEY) ?? '[]');
    if (Array.isArray(v)) keys = v.filter((k): k is string => typeof k === 'string');
  } catch {
    // Unreadable: this tab's memory still counts.
  }
  here = new Set(keys);
  return here;
}

function add(key: string): void {
  const next = new Set(read());
  next.add(key);
  here = next;
  try {
    sessionStorage.setItem(SEEN_HERE_KEY, JSON.stringify([...next]));
  } catch {
    // Kept in memory for this tab.
  }
  listeners.forEach((l) => l());
}

/** Tests only: a fresh tab. */
export function resetSeenHereForTests(): void {
  here = null;
  try {
    sessionStorage.removeItem(SEEN_HERE_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The keys seen in this visit, live. */
export function useSeenHere(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** PUT /api/v1/me/seen-items/{key}: 204 when stored. True once it lands. */
async function put(key: string): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { response } = await untyped.PUT(`/api/v1/me/seen-items/${encodeURIComponent(key)}`);
      if (response.ok) return true;
      // A refusal (422 bad key, 403 preview) won't change on a retry.
      if (response.status < 500 && response.status !== 429) return false;
    } catch {
      // Offline or a dropped connection: worth another try.
    }
    const delay = RETRY_MS[attempt];
    if (delay === undefined) return false;
    await wait(delay);
  }
}

/**
 * Marks `key` seen: here and in the cached /me now, on the account after.
 * Resolves once the write is done or given up; callers needn't wait.
 */
export async function markSeen(key: string, qc?: QueryClient): Promise<boolean> {
  if (!SEEN_KEY.test(key)) return false;
  add(key);
  if (qc)
    patchViewer(qc, (m) =>
      m.seenItems?.includes(key) ? {} : { seenItems: [...(m.seenItems ?? []), key] },
    );
  if (isPreviewing()) return false;
  return put(key);
}

/** markSeen with this app's query cache. */
export function useMarkSeen(): (key: string) => void {
  const qc = useQueryClient();
  return useCallback((key: string) => void markSeen(key, qc), [qc]);
}
