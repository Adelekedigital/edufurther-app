'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

/** Why a reminder didn't go, keyed as the dialog's words are (`lib/copy/reminder`). */
export type ReminderFailure = 'alreadySent' | 'closed' | 'offline' | 'failed';

type SendInput = { bookingId: string; message: string };

/**
 * A 409 is the request having moved on, or a reminder already sent; a 403 or
 * 404 can't succeed on a retry either (not this viewer's to remind), so it
 * reads as closed rather than "try again".
 */
export const reminderFailure = (e: unknown): ReminderFailure => {
  if (e instanceof ApiError) {
    if (e.status === 409 && e.type?.endsWith('/problems/reminder-already-sent'))
      return 'alreadySent';
    if (e.status === 409 || e.status === 403 || e.status === 404) return 'closed';
  }
  return normaliseError(e).kind === 'offline' ? 'offline' : 'failed';
};

/**
 * POST /sessions/{id}/reminder: a mentee nudges the mentor about their pending
 * request, once, by email (PRD Mentee Bookings). The server holds every rule
 * (mentee only, pending and before `respond_by`, once); the page only offers it
 * with under 24 hours left.
 *
 * Not optimistic: "Reminder sent" is shown once the server has it, and the
 * session read's `reminder_sent_at` keeps it across a reload.
 */
export function useSendReminder() {
  const qc = useQueryClient();
  const mutation = useMutation<void, ReminderFailure, SendInput>({
    // Offline, fail at once: a paused send would post on reconnect after the
    // dialog had closed.
    networkMode: 'always',
    retry: false,
    mutationFn: async ({ bookingId, message }) => {
      let result;
      try {
        result = await api.POST('/api/v1/sessions/{session_id}/reminder', {
          params: { path: { session_id: bookingId } },
          body: { message },
        });
      } catch (e) {
        throw reminderFailure(e);
      }
      const { error, response } = result;
      if (!response.ok) throw reminderFailure(apiError(response.status, error, response));
    },
    // On a refusal too: a 409 means the row has moved on (answered, lapsed, or
    // already reminded from another tab), and asking is the way to show it.
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.bookings.all }),
  });
  return {
    send: mutation.mutate,
    isPending: mutation.isPending,
    failure: mutation.error ?? null,
    reset: mutation.reset,
  };
}
