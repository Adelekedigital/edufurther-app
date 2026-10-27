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
};

/** The move's refusal in our words; every one leaves the session as it was. */
export function moveError(e: unknown): AppError {
  const n = normaliseError(e);
  const said = (message: string): AppError => ({ ...n, message });
  if (e instanceof ApiError && e.status === 409 && e.type?.endsWith('/problems/move-too-late'))
    return said(MOVE_COPY.tooLate);
  switch (n.kind) {
    // 422: not a time the grid offers now. A plain 409: taken while moving,
    // or the session itself changed; either way another time is the answer.
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
    case 'offline':
    case 'unauthorized':
    case 'rateLimited':
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
      const body = { starts_at: req.startsAt };
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
      if (!data) throw apiError(response.status, error);
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
