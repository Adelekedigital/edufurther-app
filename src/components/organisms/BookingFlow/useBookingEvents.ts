'use client';

import { useEffect, useRef } from 'react';
import type { BookingStep, EntryPoint } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { useOnLeave } from '@/lib/analytics/useOnLeave';
import { useLatest } from '@/lib/utils/useLatest';

type Options = {
  entryPoint: EntryPoint;
  /** As the flow opened (a guest who signs in mid-flow is still a guest's booking). */
  isGuest: boolean;
  requestDone: boolean;
};

/**
 * The booking funnel (PRD 30): started when the flow opens, each step once as
 * it is finished, requested when the request goes through, abandoned when the
 * flow goes (closed, navigated away) before that. One flow instance is one
 * booking: every event at most once, StrictMode's double effects included.
 */
export function useBookingEvents({ entryPoint, isGuest, requestDone }: Options) {
  const s = useRef({
    started: false,
    requested: false,
    done: new Set<BookingStep>(),
    last: 'started' as 'started' | BookingStep,
    /** The offering of the request in flight, for booking_requested. */
    sentType: null as string | null,
  });
  const entry = useLatest(entryPoint);

  useEffect(() => {
    const st = s.current;
    if (st.started) return;
    st.started = true;
    track('booking_started', { entry_point: entry.current, is_guest: isGuest });
    // Once, on open: the guest flag is the opening one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const st = s.current;
    if (!requestDone || st.requested || !st.sentType) return;
    st.requested = true;
    track('booking_requested', { entry_point: entry.current, session_type_id: st.sentType });
  }, [requestDone, entry]);

  useOnLeave(() => {
    const st = s.current;
    if (!st.started || st.requested) return;
    track('booking_abandoned', { entry_point: entry.current, last_step: st.last });
  });

  return {
    /** A step finished (Continue, or the request sent from it). Each counts once. */
    stepDone: (step: BookingStep) => {
      const st = s.current;
      st.last = step;
      if (st.done.has(step)) return;
      st.done.add(step);
      track('booking_step_completed', { step, entry_point: entry.current });
    },
    /** The request went out for this offering; requested once the page says it's done. */
    sent: (sessionTypeId: string) => {
      s.current.sentType = sessionTypeId;
    },
  };
}
