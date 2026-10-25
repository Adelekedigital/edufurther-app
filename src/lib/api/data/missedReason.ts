'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { SessionRoom } from '@/types/booking';
import { apiError, ApiError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type MissedReasonWrite = components['schemas']['MissedReasonWrite'];

/** The second send of the same reason: already stored, so the form is done. */
const ALREADY_SENT = '/problems/missed-reason-already-sent';

/**
 * Why a missed session was missed, from the person who missed it (PRD Session
 * Join; backend: `POST /sessions/{id}/missed-reason`). Internal only: read by
 * admins, never by the other party. Once per person per session, so a 409 means
 * it is already there, and the page says thanks either way.
 */
export function useSendMissedReason(sessionId: string) {
  const qc = useQueryClient();
  const session = useSession();
  const roomKey = keys.bookings.room(sessionId, sessionKey(session));
  const markSent = () =>
    qc.setQueryData<SessionRoom>(roomKey, (room) =>
      room ? { ...room, missedReasonSent: true } : room,
    );
  const mutation = useMutation({
    // Offline, fail at once rather than post later from a form that is gone.
    networkMode: 'always',
    mutationFn: async (body: MissedReasonWrite) => {
      const { data, error, response } = await api.POST(
        '/api/v1/sessions/{session_id}/missed-reason',
        { params: { path: { session_id: sessionId } }, body },
      );
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onSuccess: markSent,
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409 && e.type?.endsWith(ALREADY_SENT)) markSent();
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: roomKey }),
  });
  const alreadySent =
    mutation.error instanceof ApiError &&
    mutation.error.status === 409 &&
    !!mutation.error.type?.endsWith(ALREADY_SENT);
  return {
    send: (reason: string, note: string) =>
      mutation.mutate({ reason: reason as MissedReasonWrite['reason'], note: note || null }),
    isPending: mutation.isPending,
    /** A failure worth saying; an "already sent" is not one. */
    failed: !!mutation.error && !alreadySent,
  };
}
