'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError } from '@/types/mentor';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/** The four coded reasons a person would actually pick. */
export const PICKABLE_REASONS = [
  'mentor_unavailable',
  'mentee_no_longer_needed',
  'scheduling_conflict',
  'technical_issue',
] as const;

export type PickableReason = (typeof PICKABLE_REASONS)[number];

export type BookingAction = 'accept' | 'decline' | 'withdraw' | 'cancel';

export type ActionInput = {
  bookingId: string;
  /** Optional on purpose: a required reason turns a decision into an argument. */
  reasonCode?: PickableReason | null;
  /** What the other party reads. Up to 2000 characters. */
  reasonText?: string | null;
  /**
   * Mentor cancel only. `true` — the default — puts the hour back on the grid.
   * `false` records an availability exception instead.
   */
  releaseSlot?: boolean;
};

const PATHS = {
  accept: '/api/v1/sessions/{session_id}/accept',
  decline: '/api/v1/sessions/{session_id}/decline',
  withdraw: '/api/v1/sessions/{session_id}/withdraw',
  cancel: '/api/v1/sessions/{session_id}/cancel',
} as const;

/**
 * Words for a refusal, by status. `detail` is never shown (ADR-0016): the
 * server's own text is for logs, not for the person who clicked.
 */
export function actionError(e: AppError, action: BookingAction): AppError {
  if (e.kind === 'conflict')
    return {
      ...e,
      message:
        action === 'accept'
          ? 'This request was answered or withdrawn while you were looking.'
          : 'This booking changed while you were looking.',
    };
  if (e.kind === 'notFound') return { ...e, message: 'This booking isn’t there any more.' };
  if (e.kind === 'validation')
    return { ...e, message: 'We couldn’t do that. Reload the page and try again.' };
  if (e.kind === 'offline')
    return { ...e, message: 'You’re offline. Try again when you reconnect.' };
  return { ...e, message: 'Something went wrong on our side. Try again in a moment.' };
}

/**
 * The one writer for accept, decline, withdraw and cancel.
 *
 * Shared so the four cannot drift: the same refusal wording, and the same
 * invalidation. Every list and the single booking go together, because any of
 * these moves a row from one tab to another — leaving the old tab showing it is
 * worse than a moment's loading.
 *
 * No optimistic status. A 409 here is not rare — the other party may have
 * answered the same request seconds ago — and a row that flips to "confirmed"
 * and then back to "pending" reads as the app ignoring the click.
 */
export function useBookingAction(action: BookingAction) {
  const qc = useQueryClient();
  return useMutation<void, AppError, ActionInput>({
    mutationFn: async ({ bookingId, reasonCode, reasonText, releaseSlot }) => {
      const body: Record<string, unknown> = {};
      if (reasonCode) body.reason_code = reasonCode;
      const text = reasonText?.trim();
      if (text) body.reason_text = text;
      if (action === 'cancel' && releaseSlot !== undefined) body.release_slot = releaseSlot;

      const { error, response } = await api.POST(PATHS[action], {
        params: { path: { session_id: bookingId } },
        // The payload is optional in the contract; an empty object is still a
        // body the server accepts, and keeps one code path.
        body,
      });
      if (!response.ok) {
        throw actionError(normaliseError(apiError(response.status, error, response)), action);
      }
    },
    retry: false,
    onSettled: () => {
      // On failure too: a 409 means the row has already moved, and the only way
      // to show what it moved to is to ask.
      void qc.invalidateQueries({ queryKey: keys.bookings.all });
    },
  });
}

/** True when the thrown value is one of ours rather than a raw ApiError. */
export function isActionError(e: unknown): e is AppError {
  return !!e && typeof e === 'object' && 'kind' in e && !(e instanceof ApiError);
}
