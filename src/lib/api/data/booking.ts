'use client';

import { useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { BookingDay, BookingRequest, SessionType } from '@/types/mentor';
import { normaliseError } from './errors';
import { keys } from './keys';

/**
 * PHASE A MOCK. Booking options and the booking request are typed mocks,
 * per the approved plan. Phase B replaces the two `mock*` functions with:
 *   - GET  /api/v1/mentors/{handle}                (session_types inlined)
 *   - GET  /api/v1/users/{id}/availability/slots   (per session type)
 *   - POST booking create, idempotent per backend ADR 0024
 * The hook signatures below are the contract the UI is built against; they do
 * not change in phase B.
 */

export type BookingOptions = { sessionTypes: SessionType[]; days: BookingDay[] };

const MOCK_SESSION_TYPES: SessionType[] = [
  {
    id: 'st-general',
    name: 'General mentorship',
    durationMin: 60,
    description:
      'An open conversation about your study-abroad plans: schools, funding and next steps.',
    questions: [
      { id: 'q-cover', label: 'What would you like to cover?', kind: 'text', required: false },
      {
        id: 'q-file',
        label: 'Upload anything that helps (optional CV)',
        kind: 'file',
        required: false,
      },
    ],
  },
  {
    id: 'st-cv',
    name: 'CV review',
    durationMin: 60,
    description: 'We go through your CV line by line and fix what admissions teams skim past.',
    questions: [
      {
        id: 'q-role',
        label: 'What role or program is this CV for?',
        kind: 'text',
        required: false,
      },
      { id: 'q-cv', label: 'Upload your current CV', kind: 'file', required: true },
    ],
  },
];

const HOURS = [[7, 8, 13, 14], [20, 22], [7, 13, 14, 23], [10], [9, 16]];

function mockDays(now = new Date()): BookingDay[] {
  const days: BookingDay[] = [];
  for (let i = 0; i < HOURS.length; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i + 1);
    const date = d.toISOString().slice(0, 10);
    days.push({
      date,
      slots: HOURS[i]!.map((h) => {
        const s = new Date(d);
        s.setHours(h, 0, 0, 0);
        return { startsAt: s.toISOString() };
      }),
    });
  }
  return days;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

async function mockOptions(signal?: AbortSignal): Promise<BookingOptions> {
  await wait(350, signal);
  return { sessionTypes: MOCK_SESSION_TYPES, days: mockDays() };
}

async function mockRequest(_req: BookingRequest, _idempotencyKey: string): Promise<{ id: string }> {
  await wait(600);
  return { id: `bk-${Date.now()}` };
}

export function useBookingOptions(mentorId: string | null) {
  const query = useQuery({
    queryKey: keys.booking.options(mentorId ?? 'none'),
    queryFn: ({ signal }) => mockOptions(signal),
    enabled: mentorId !== null,
    staleTime: 60_000,
  });
  return {
    options: query.data ?? null,
    isLoading: query.isPending && mentorId !== null,
    error: query.error ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/**
 * One idempotency key per booking attempt: a retry after a timeout re-sends the
 * same key, so the server can't create the booking twice (backend ADR 0024).
 */
export function useRequestBooking() {
  const keyRef = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (req: BookingRequest) => {
      keyRef.current ??= crypto.randomUUID();
      return mockRequest(req, keyRef.current);
    },
    onSuccess: () => {
      keyRef.current = null;
    },
  });
  return {
    request: mutation.mutate,
    isPending: mutation.isPending,
    isDone: mutation.isSuccess,
    error: mutation.error ? normaliseError(mutation.error) : null,
    reset: () => {
      keyRef.current = null;
      mutation.reset();
    },
  };
}
