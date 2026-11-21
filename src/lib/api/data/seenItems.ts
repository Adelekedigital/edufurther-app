'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { addSeenHere, seenHere, subscribeSeenHere } from '@/lib/utils/seenHere';
import { SEEN_KEY } from '@/lib/utils/whatsNew';
import { api } from './http';
import { isPreviewing } from './previewStore';
import { patchViewer } from './viewer';

/**
 * What the account has seen (`/me.seen_items`): a "What's
 * new" tour's release id once it's dismissed or finished (ADR 0014).
 *
 * Optimistic: the key joins the cached /me and this tab's list for this
 * viewer (lib/utils/seenHere) at once, so the tour never comes back in this
 * visit, even if the write fails or a /me refetch lands before it. The write
 * (PUT, idempotent) then retries quietly. Never in Preview as user: the admin
 * didn't see it for them, so nothing is kept or sent.
 */

/** Waits before each retry; three tries in all. */
export const RETRY_MS = [2_000, 8_000];

const EMPTY: ReadonlySet<string> = new Set();

/** The keys this viewer has seen in this visit, live. */
export function useSeenHere(viewerId: string | null): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeSeenHere,
    () => seenHere(viewerId),
    () => EMPTY,
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** PUT /api/v1/me/seen-items/{key}: 204 when stored. True once it lands. */
async function put(key: string): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { response } = await api.PUT('/api/v1/me/seen-items/{key}', {
        params: { path: { key } },
      });
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
 * Marks `key` seen for this viewer: here and in the cached /me now, on the
 * account after. Resolves once the write is done or given up; callers needn't wait.
 */
export async function markSeen(key: string, viewerId: string, qc?: QueryClient): Promise<boolean> {
  if (!SEEN_KEY.test(key) || isPreviewing()) return false;
  addSeenHere(viewerId, key);
  if (qc)
    patchViewer(qc, (m) =>
      m.id !== viewerId || m.seenItems?.includes(key)
        ? {}
        : { seenItems: [...(m.seenItems ?? []), key] },
    );
  return put(key);
}

/** markSeen with this app's query cache. */
export function useMarkSeen(viewerId: string | null): (key: string) => void {
  const qc = useQueryClient();
  return useCallback(
    (key: string) => {
      if (viewerId) void markSeen(key, viewerId, qc);
    },
    [qc, viewerId],
  );
}
