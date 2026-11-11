'use client';

import { useEffect, useRef, useState } from 'react';
import { clearHandOff, peekHandOff, registerBookingFlow } from '@/lib/analytics/bookingHandOff';
import type { BookingStep, EntryPoint } from '@/lib/analytics/events';
import { setReplayScope, track } from '@/lib/analytics/track';
import { useOnLeave } from '@/lib/analytics/useOnLeave';
import { useLatest } from '@/lib/utils/useLatest';

type Options = {
  mentorId: string;
  entryPoint: EntryPoint;
  /** As the flow opened (a guest who signs in mid-flow is still a guest's booking). */
  isGuest: boolean;
  requestDone: boolean;
};

/**
 * The booking funnel (PRD 30): started when the flow opens, each step once as
 * it is finished, requested when the request goes through, abandoned when the
 * flow goes (closed, navigated away) before that. One booking is one funnel:
 * every event at most once, StrictMode's double effects included.
 *
 * A booking handed off to sign-in or onboarding (bookingHandOff) is paused:
 * leaving for it is no abandon, and the flow that reopens it carries on with
 * the original entry point, without a second start or replayed steps.
 */
export function useBookingEvents({ mentorId, entryPoint, isGuest, requestDone }: Options) {
  // Read once, as the flow opens: a paused booking with this mentor.
  const [resumed] = useState(() => peekHandOff(mentorId));
  const entry = resumed?.entryPoint ?? entryPoint;
  const s = useRef({
    started: !!resumed,
    requested: false,
    handedOff: false,
    done: new Set<BookingStep>(resumed?.done ?? []),
    last: resumed?.last ?? ('started' as 'started' | BookingStep),
    /** The offering of the request in flight, for booking_requested. */
    sentType: null as string | null,
  });
  const entryRef = useLatest(entry);

  useEffect(() => {
    const st = s.current;
    // The pause is used once; the steps it carried are already counted.
    if (resumed) clearHandOff();
    if (!st.started) {
      st.started = true;
      track('booking_started', { entry_point: entryRef.current, is_guest: isGuest });
    }
    // Open: session replay may record it, and the page may hand it off.
    setReplayScope('booking', true);
    const unregister = registerBookingFlow({
      funnel: () => ({
        mentorId,
        entryPoint: entryRef.current,
        last: st.last,
        done: [...st.done],
      }),
      setHandedOff: (on) => {
        st.handedOff = on;
      },
    });
    return () => {
      unregister();
      setReplayScope('booking', false);
    };
    // Once, on open: the guest flag and the mentor are the opening ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const st = s.current;
    if (!requestDone || st.requested || !st.sentType) return;
    st.requested = true;
    track('booking_requested', { entry_point: entryRef.current, session_type_id: st.sentType });
  }, [requestDone, entryRef]);

  useOnLeave(() => {
    const st = s.current;
    if (!st.started || st.requested || st.handedOff) return;
    track('booking_abandoned', { entry_point: entryRef.current, last_step: st.last });
  });

  return {
    /** The surface this booking began on: the original one for a resumed booking. */
    entryPoint: entry,
    /** A step finished (Continue, or the request sent from it). Each counts once. */
    stepDone: (step: BookingStep) => {
      const st = s.current;
      st.last = step;
      if (st.done.has(step)) return;
      st.done.add(step);
      track('booking_step_completed', { step, entry_point: entryRef.current });
    },
    /** The request went out for this offering; requested once the page says it's done. */
    sent: (sessionTypeId: string) => {
      s.current.sentType = sessionTypeId;
    },
  };
}
