'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError } from '@/types/mentor';
import type { PickableReason } from '@/types/booking';
import { ApiError, apiError, normaliseError, retryAfterMinutes } from './errors';
import { api } from './http';
import { keys } from './keys';

export type BookingAction = 'accept' | 'decline' | 'withdraw' | 'cancel';

export type ActionInput = {
  bookingId: string;
  /**
   * Optional in the contract, and still optional here: a mentor who offers
   * another time instead sends none. The dialog requires one everywhere else
   * (owner, 2026-10-10) — that rule lives in `ReasonField.reasonError`, not
   * in this type, because the server accepts a request without it.
   */
  reasonCode?: PickableReason | null;
  /** What the other party reads. Up to 2000 characters. */
  reasonText?: string | null;
  /**
   * Mentor cancel only. `true` — the default — puts the hour back on the grid.
   * `false` records an availability exception instead.
   */
  releaseSlot?: boolean;
  /**
   * Mentors only, on a decline or cancel: another time to offer instead. Must
   * be an instant `/slots` currently lists for this offering, exactly — which
   * is why the picker only ever offers those.
   */
  suggestedStartsAt?: string;
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
  // A 409 carrying a problem type is peeled off by `normaliseError` before the
  // generic branch, so these never arrive as `conflict`. Blaming ourselves for
  // an overlap we had just warned about is the worst of it.
  if (e.kind === 'bookingOverlap')
    return {
      ...e,
      message: 'This runs into another session on your calendar, so it can’t be accepted.',
    };
  if (e.kind === 'bookingWithMentorExists' || e.kind === 'bookingLimitReached') return e;
  if (e.kind === 'noCredit')
    return { ...e, message: 'There aren’t enough credits for this any more.' };
  if (e.kind === 'unauthorized')
    return { ...e, message: 'Your session timed out. Log in again and try once more.' };
  if (e.kind === 'rateLimited') {
    const mins = retryAfterMinutes(e.retryAfter);
    return {
      ...e,
      message: mins
        ? `You’ve done that a few times just now. Try again in ${mins} ${mins === 1 ? 'minute' : 'minutes'}.`
        : 'You’ve done that a few times just now. Try again shortly.',
    };
  }
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
    mutationFn: async ({ bookingId, reasonCode, reasonText, releaseSlot, suggestedStartsAt }) => {
      // `Record<string, unknown>`, so nothing here checks the codes against the
      // contract — and our `openapi.json` predates `other` (backend #414), so
      // it could not anyway. This is the seam where a typo in a code would
      // otherwise be caught. Re-syncing the spec gives it back.
      const body: Record<string, unknown> = {};
      if (reasonCode) body.reason_code = reasonCode;
      const text = reasonText?.trim();
      if (text) body.reason_text = text;
      if (action === 'cancel' && releaseSlot !== undefined) body.release_slot = releaseSlot;
      if (suggestedStartsAt && action !== 'withdraw' && action !== 'accept')
        body.suggested_starts_at = suggestedStartsAt;

      let result;
      try {
        result = await api.POST(PATHS[action], {
          params: { path: { session_id: bookingId } },
          // The payload is optional in the contract; an empty object is still a
          // body the server accepts, and keeps one code path.
          body,
        });
      } catch (e) {
        // A fetch rejection — offline mid-click, DNS, a dropped connection —
        // is a TypeError, not a response. Unwrapped it travels down a channel
        // typed as AppError and the browser's own "Failed to fetch" is read
        // out in a role="alert".
        throw actionError(normaliseError(e), action);
      }
      const { error, response } = result;
      if (!response.ok) {
        throw actionError(normaliseError(apiError(response.status, error, response)), action);
      }
    },
    retry: false,
    onSettled: () => {
      // On failure too: a 409 means the row has already moved, and the only way
      // to show what it moved to is to ask.
      void qc.invalidateQueries({ queryKey: keys.bookings.all });
      // And everything outside that tree these writes also change. The booking
      // writer two files away invalidates the same set for the same reasons.
      //  - `/me` carries the tab counts and the nav badge that sent the mentor
      //    here, and the mentee's credit balance, which a refund moves.
      //  - a mentor's cancel with `release_slot: false` writes an availability
      //    exception, and an accept adds a dot to the month.
      //  - a decline or cancel frees an hour the booking grid and the mentor
      //    cards both advertise.
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
      void qc.invalidateQueries({ queryKey: keys.calendar.all });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      void qc.invalidateQueries({ queryKey: ['booking', 'slots'] });
    },
  });
}

/** True when the thrown value is one of ours rather than a raw ApiError. */
export function isActionError(e: unknown): e is AppError {
  return !!e && typeof e === 'object' && 'kind' in e && !(e instanceof ApiError);
}
