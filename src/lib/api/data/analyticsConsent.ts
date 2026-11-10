'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { components } from '@/lib/api/generated/schema';
import type { ConsentAnswer } from '@/lib/analytics/consent';
import { consentStore } from '@/lib/analytics/consentStore';
import type { Acquisition } from '@/lib/analytics/acquisition';
import { api } from './http';
import { isPreviewing } from './previewStore';

type AcquisitionRead = components['schemas']['AcquisitionRead'];

/**
 * The account's half of PRD 30: the consent answer
 * (PUT /api/v1/me/consents/analytics, read back on /me `analytics_consent`)
 * and where the account came from (POST /api/v1/me/acquisition, write-once).
 * The device's half is the cookie (lib/analytics/consent). Neither is ever
 * sent in a preview: the admin didn't answer for the person they're viewing.
 */

/** Stores the answer on the account. False when it didn't land; the cookie still holds it and the next visit retries. */
export async function saveConsent(a: ConsentAnswer): Promise<boolean> {
  if (isPreviewing()) return false;
  try {
    const { response } = await api.PUT('/api/v1/me/consents/analytics', {
      body: { granted: a.granted, version: a.version },
    });
    return response.ok;
  } catch {
    return false;
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
  { ok: true; read: AcquisitionRead | null } | { ok: false };

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
  const answer = useSyncExternalStore(
    consentStore.subscribe,
    consentStore.get,
    consentStore.getServer,
  );
  const [busy, setBusy] = useState(false);
  const choose = useCallback(
    async (granted: boolean) => {
      // The device follows at once (same-session effect); the account after.
      const a = consentStore.answer(granted);
      if (!memberId) return;
      setBusy(true);
      try {
        await saveConsent(a);
      } finally {
        setBusy(false);
      }
    },
    [memberId],
  );
  return { answer, choose, busy };
}
