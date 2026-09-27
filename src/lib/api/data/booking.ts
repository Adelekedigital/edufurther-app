'use client';

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { AppError, BookingRequest, Remote, SessionType } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';

type SessionTypeRead = components['schemas']['SessionTypeRead'];

/**
 * How far ahead the booking modal looks: one request (the backend allows 56 days).
 * Days without a slot are not shown, so a quiet month still opens on its first
 * open day — the same instant the card's "next available" names.
 */
export const SLOT_HORIZON_DAYS = 28;

// ---- mapping ----------------------------------------------------------------

export function toSessionType(r: SessionTypeRead): SessionType {
  return {
    id: r.id,
    name: r.name,
    durationMin: r.duration_minutes,
    description: r.description?.trim() ?? '',
    // PENDING BACKEND (booking reply #1): questions inline on SessionTypeRead are
    // not shipped, and POST /sessions takes no answers yet (#2). Until both ship
    // there is nothing to ask, so the flow has no questions step.
    questions: [],
  };
}

/** `end` for /slots: a date, exclusive. `start` is left to the backend (the mentor's today). */
export function slotsEnd(now = new Date(), days = SLOT_HORIZON_DAYS): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * One Idempotency-Key per booking *attempt* (backend ADR 0024): a retry of the
 * same request re-sends the key, so a timeout can't book twice — but a different
 * time or offering is a new attempt with a new key, or the backend answers 422
 * ("this key already stands for a different request").
 */
export function keyForAttempt(
  current: { key: string; body: string } | null,
  body: string,
  newKey: () => string,
): { key: string; body: string } {
  return current && current.body === body ? current : { key: newKey(), body };
}

/** Booking-specific copy over the generic error (never the server's `detail`). */
export function bookingError(e: AppError): AppError {
  switch (e.kind) {
    case 'unauthorized':
      return { ...e, message: 'Log in to book this session.' };
    case 'conflict':
      return { ...e, message: 'That time was just taken. Pick another time.' };
    case 'validation':
      return { ...e, message: 'That time isn’t available any more. Pick another time.' };
    case 'noCredit':
      // PROVISIONAL copy — design request #37.
      return { ...e, message: 'You’re out of credits, so this session can’t be booked yet.' };
    case 'notFound':
      return { ...e, message: 'This session can’t be booked any more.' };
    default:
      return { ...e, message: `We couldn’t send your request. ${e.message} Try again.` };
  }
}

// ---- hooks ------------------------------------------------------------------

/** GET /users/{id}/session-types — what this mentor offers. */
export function useSessionTypes(mentorId: string | null): Remote<SessionType[]> {
  const query = useQuery({
    queryKey: keys.booking.sessionTypes(mentorId ?? 'none'),
    enabled: mentorId !== null,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/users/{user_id}/session-types', {
        params: { path: { user_id: mentorId! } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      return data.data.map(toSessionType);
    },
    staleTime: 5 * 60 * 1000,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && mentorId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * GET /users/{id}/availability/slots for one offering: UTC instants. The UI
 * groups them into days in the viewer's zone (utils/slots.ts).
 */
export function useSlots(mentorId: string | null, sessionTypeId: string | null): Remote<string[]> {
  const enabled = mentorId !== null && sessionTypeId !== null;
  const query = useQuery({
    queryKey: keys.booking.slots(mentorId ?? 'none', sessionTypeId ?? 'none'),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET(
        '/api/v1/users/{user_id}/availability/slots',
        {
          params: {
            path: { user_id: mentorId! },
            query: { session_type_id: sessionTypeId!, end: slotsEnd() },
          },
          signal,
        },
      );
      if (!data) throw apiError(response.status, error);
      return data.data.map((s) => s.start);
    },
    // Slots go stale as people book; a minute is short enough and saves a
    // refetch when the type select is toggled back and forth.
    staleTime: 60 * 1000,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isPending && enabled,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** POST /sessions. The mentor follows from the session type. */
export function useRequestBooking() {
  const queryClient = useQueryClient();
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const mutation = useMutation({
    mutationFn: async (req: BookingRequest) => {
      // PENDING BACKEND (booking reply #2): `answers` has no field on the booking
      // body yet, so it is not sent — and the flow asks no questions (see above).
      const body = { session_type_id: req.sessionTypeId, starts_at: req.startsAt };
      attempt.current = keyForAttempt(attempt.current, JSON.stringify(body), () =>
        crypto.randomUUID(),
      );
      const { data, error, response } = await api.POST('/api/v1/sessions', {
        params: { header: { 'Idempotency-Key': attempt.current.key } },
        body,
      });
      if (!data) throw apiError(response.status, error);
      return data;
    },
    onSuccess: () => {
      attempt.current = null;
    },
    onSettled: (_data, _error, req) => {
      // A booking (or a slot taken meanwhile) changes this mentor's grid and
      // their "next available" on the cards.
      void queryClient.invalidateQueries({ queryKey: keys.booking.slotsFor(req.mentorId) });
      void queryClient.invalidateQueries({ queryKey: keys.mentors.all });
    },
  });
  return {
    request: mutation.mutate,
    isPending: mutation.isPending,
    isDone: mutation.isSuccess,
    error: mutation.error ? bookingError(normaliseError(mutation.error)) : null,
    reset: () => {
      attempt.current = null;
      mutation.reset();
    },
  };
}
