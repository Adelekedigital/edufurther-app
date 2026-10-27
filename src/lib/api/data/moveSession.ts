'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MOVE_COPY } from '@/lib/copy/session';
import type { Booking } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import { keyForAttempt } from './booking';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

export type MoveRequest = {
  booking: Booking;
  startsAt: string;
  /**
   * "Message to {First}": the new session's note, in the mentor's booking
   * email; blank keeps the old note.
   */
  message: string;
};

/**
 * The move's refusal in our words. Every answer from the server leaves the
 * session as it was, so each says so; offline does not, as the move may have
 * landed before the connection went.
 */
export function moveError(e: unknown): AppError {
  const n = normaliseError(e);
  const said = (message: string): AppError => ({ ...n, message });
  if (e instanceof ApiError && e.status === 409 && e.type?.endsWith('/problems/move-too-late'))
    return said(MOVE_COPY.tooLate);
  switch (n.kind) {
    // 422: not a time the grid offers now. A plain 409 is mostly the time
    // taken while moving; one for a session that has ended meanwhile is
    // corrected by the refetch, which takes the page to Bookings.
    case 'validation':
    case 'conflict':
      return said(MOVE_COPY.slotTaken);
    case 'notFound':
      return said(MOVE_COPY.gone);
    case 'bookingOverlap':
    case 'bookingWithMentorExists':
    case 'bookingLimitReached':
    case 'needsOnboarding':
      return said(`${n.message} ${MOVE_COPY.nothingChanged}`);
    case 'unauthorized':
    case 'rateLimited':
      return said(`${n.message} ${MOVE_COPY.nothingChanged}`);
    case 'offline':
      return n;
    default:
      return said(MOVE_COPY.failed);
  }
}

/**
 * The mentee's move: POST /sessions/{id}/move (backend decision 300). One
 * transaction on the server: the old session ends, the new time is booked, and
 * the credit and intake answers go with it, so a refusal changes nothing and
 * there is nothing to undo here. One Idempotency-Key per attempt, as booking.
 */
export function useMoveSession() {
  const qc = useQueryClient();
  const attempt = useRef<{ key: string; body: string } | null>(null);
  // The page may go before the answer does: no navigation from a page that has gone.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (req: MoveRequest) => {
      const body = { starts_at: req.startsAt, message: req.message };
      // The server's fingerprint covers the message too: an edited one is a new attempt.
      attempt.current = keyForAttempt(attempt.current, JSON.stringify([req.booking.id, body]), () =>
        crypto.randomUUID(),
      );
      const { data, error, response } = await api.POST('/api/v1/sessions/{session_id}/move', {
        params: {
          path: { session_id: req.booking.id },
          header: { 'Idempotency-Key': attempt.current.key },
        },
        body,
      });
      if (!data) throw apiError(response.status, error, response);
      return data;
    },
    onSuccess: () => {
      attempt.current = null;
    },
    onSettled: (_data, _error, req) => {
      // As a cancel and a booking would: the lists and both rooms, /me's
      // counts, both times on the mentor's grid and cards, and Book again.
      void qc.invalidateQueries({ queryKey: keys.bookings.all });
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
      void qc.invalidateQueries({ queryKey: keys.metMentors.all });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      void qc.invalidateQueries({ queryKey: keys.booking.slotsFor(req.booking.other.id) });
    },
  });
  const { mutate, reset: resetMutation } = mutation;
  // One object per refusal, so the dialog can tell a new one from a re-render.
  const error = useMemo(
    () => (mutation.error ? moveError(mutation.error) : null),
    [mutation.error],
  );

  const move = useCallback(
    (req: MoveRequest, onMoved: (newId: string, confirmed: boolean) => void) => {
      mutate(req, {
        onSuccess: (created) => {
          if (alive.current) onMoved(created.id, created.status === 'confirmed');
        },
      });
    },
    [mutate],
  );

  return {
    move,
    isPending: mutation.isPending,
    error,
    /** The dialog closed: its error goes, and the next press is a new attempt. */
    reset: useCallback(() => {
      attempt.current = null;
      resetMutation();
    }, [resetMutation]),
  };
}
