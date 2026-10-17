'use client';

import { apiError, normaliseError } from './errors';
import { untyped, type AssistField, type WireAssist, type WireAssistRequest } from './pending';

/** Our words for each failure (PRD B7); the server's `detail` is never shown. */
export const ASSIST_COPY = {
  limit: 'You’ve used today’s writing help. Try again tomorrow.',
  offline: 'You’re offline. Try again when you’re connected.',
  // PROVISIONAL: the PRD names the 503 but not its copy (design request).
  unavailable: 'Writing help isn’t available right now. Try again later.',
};

export type AssistResult = { text: string; promptVersion: string };

export const ASSIST_TIMEOUT_MS = 25_000;

/** One call, its text back; a failure rejects with an Error whose message is our copy. */
export async function requestAssist(
  field: AssistField,
  mode: 'draft' | 'improve',
  text: string,
): Promise<AssistResult> {
  try {
    const body: WireAssistRequest = mode === 'improve' ? { field, mode, text } : { field, mode };
    const { data, error, response } = await untyped.POST('/api/v1/me/writing-assist', {
      body,
      // The backend answers 503 when the router passes 20 s (PRD B7); 5 s more
      // covers the network, then we say so ourselves rather than spin.
      signal: AbortSignal.timeout(ASSIST_TIMEOUT_MS),
    });
    if (!response.ok) throw apiError(response.status, error, response);
    const r = data as WireAssist;
    return { text: r.text, promptVersion: r.prompt_version };
  } catch (e) {
    const err = normaliseError(e);
    throw new Error(
      err.kind === 'rateLimited'
        ? ASSIST_COPY.limit
        : err.kind === 'offline'
          ? ASSIST_COPY.offline
          : ASSIST_COPY.unavailable,
    );
  }
}

/**
 * "Write a draft" / "Improve" for one long profile text (PRD B7, F6). PENDING
 * BACKEND #7 (lib/api/data/pending.ts). Nothing is saved: the text goes back
 * into the box, and the field's own Save keeps it or not. No cache and no
 * shared state, so a plain call rather than a mutation.
 */
export function useWritingAssist(field: AssistField) {
  return { assist: (mode: 'draft' | 'improve', text: string) => requestAssist(field, mode, text) };
}
