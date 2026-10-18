'use client';

import type { components } from '@/lib/api/generated/schema';
import { apiError, normaliseError } from './errors';
import { api } from './http';

/** Which long text: a mentor's About or a mentee's bio (both `about_me`, counted apart). */
export type AssistField = components['schemas']['WritingAssistField'];

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
    // Text only to improve: a draft sent with text is refused (422).
    const { data, error, response } = await api.POST('/api/v1/me/writing-assist', {
      body: mode === 'improve' ? { field, mode, text } : { field, mode },
      // The backend answers 503 when the router passes 20 s (PRD B7); 5 s more
      // covers the network, then we say so ourselves rather than spin.
      signal: AbortSignal.timeout(ASSIST_TIMEOUT_MS),
    });
    if (!response.ok || !data) throw apiError(response.status, error, response);
    return { text: data.text, promptVersion: data.prompt_version };
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
 * "Write a draft" / "Improve" for one long profile text (PRD B7, F6; backend
 * #7). Nothing is saved: the text goes back
 * into the box, and the field's own Save keeps it or not. No cache and no
 * shared state, so a plain call rather than a mutation.
 */
export function useWritingAssist(field: AssistField) {
  return { assist: (mode: 'draft' | 'improve', text: string) => requestAssist(field, mode, text) };
}
