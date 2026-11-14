'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import {
  consentMethod,
  fromServer,
  type ConsentAnswer,
  type ConsentMethod,
} from '@/lib/analytics/consent';
import { consentStore } from '@/lib/analytics/consentStore';
import type { Acquisition } from '@/lib/analytics/acquisition';
import { api } from './http';
import { keys } from './keys';
import { isPreviewing } from './previewStore';

type AcquisitionRead = components['schemas']['AcquisitionRead'];
type ConsentWrite = components['schemas']['AnalyticsConsentWrite'];

/** Where the account came from, as POST /me/acquisition records it (the domain's name for it). */
export type SignupRead = AcquisitionRead;

/**
 * The account's half of PRD 30: the consent answer
 * (PUT /api/v1/me/consents/analytics, read back on /me `analytics_consent`)
 * and where the account came from (POST /api/v1/me/acquisition, write-once).
 * The device's half is the cookie (lib/analytics/consent). Neither is ever
 * sent in a preview: the admin didn't answer for the person they're viewing.
 */

/**
 * Stores the answer on the account and returns it as stored (the server's
 * `answered_at`), or null when it didn't land: the cookie still holds it and
 * the next visit retries. The cookie takes the server's time (one clock for
 * every later comparison) and the cached /me is refetched. The method always
 * goes with it (consentMethod: an answer stored before methods existed is
 * sent as the button that gives it), since one sent without a method resets
 * the account's to null.
 */
export async function saveConsent(
  a: ConsentAnswer,
  qc?: QueryClient,
): Promise<ConsentAnswer | null> {
  if (isPreviewing()) return null;
  try {
    const { data, response } = await api.PUT('/api/v1/me/consents/analytics', {
      body: {
        granted: a.granted,
        version: a.version,
        method: consentMethod(a),
      } satisfies ConsentWrite,
    });
    if (!response.ok) return null;
    const stored = data
      ? fromServer({
          granted: data.granted,
          version: data.version,
          answeredAt: data.answered_at,
          // Typed from the contract; absent from a backend that predates it.
          method: data.method ?? null,
        })
      : null;
    if (stored) consentStore.confirm(stored);
    void qc?.invalidateQueries({ queryKey: keys.viewer.all });
    return stored ?? a;
  } catch {
    return null;
  }
}

const SOURCES = new Set<string>(['invite', 'campaign', 'referral_site', 'direct', 'migrated']);
const CHANNELS = new Set<string>([
  'linkedin',
  'google',
  'whatsapp',
  'instagram',
  'newsletter',
  'other',
]);

/** The response as the contract names it, or null for anything else. */
function toAcquisitionRead(v: unknown): AcquisitionRead | null {
  if (!v || typeof v !== 'object') return null;
  const { source, channel } = v as { source?: unknown; channel?: unknown };
  if (typeof source !== 'string' || !SOURCES.has(source)) return null;
  return {
    source: source as AcquisitionRead['source'],
    channel:
      typeof channel === 'string' && CHANNELS.has(channel)
        ? (channel as NonNullable<AcquisitionRead['channel']>)
        : null,
  };
}

export type AcquisitionResult =
  /** Recorded now (201) or already there (200); `read` when the answer carried it. */
  { ok: true; read: SignupRead | null } | { ok: false };

/**
 * Sends the held arrival, once per account (the server keeps the first: 201,
 * then 200 with nothing changed). A direct visit sends `source: 'direct'`.
 */
export async function recordAcquisition(held: Acquisition | null): Promise<AcquisitionResult> {
  if (isPreviewing()) return { ok: false };
  try {
    const { data, response } = await api.POST('/api/v1/me/acquisition', {
      body: held
        ? {
            source: held.source,
            ...(held.channel ? { channel: held.channel } : {}),
            ...(held.referral_code ? { referral_code: held.referral_code } : {}),
          }
        : { source: 'direct' },
    });
    if (!response.ok) return { ok: false };
    // The contract types only 201's body; a 200 that carries one is read the same way.
    return { ok: true, read: toAcquisitionRead(data) };
  } catch {
    return { ok: false };
  }
}

/**
 * The consent answer for the banner and Settings: what this device holds, and
 * a way to answer. A member's answer is stored on the account too.
 */
export function useAnalyticsConsent(memberId: string | null) {
  const { answer, here, signedOutAt } = useSyncExternalStore(
    consentStore.subscribe,
    consentStore.snapshot,
    consentStore.snapshotServer,
  );
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const choose = useCallback(
    async (granted: boolean, method: ConsentMethod) => {
      // The device follows at once (same-session effect); the account after.
      const a = consentStore.answer(granted, method);
      if (!memberId) return;
      setBusy(true);
      try {
        await saveConsent(a, qc);
      } finally {
        setBusy(false);
      }
    },
    [memberId, qc],
  );
  /**
   * `here`: answered on this page, which wins over any stored answer until it
   * reloads or a session ends. `signedOutAt`: the last sign-out on this device,
   * live, so an expiry mid-page asks the next person at once.
   */
  return { answer, here, signedOutAt, choose, busy };
}
