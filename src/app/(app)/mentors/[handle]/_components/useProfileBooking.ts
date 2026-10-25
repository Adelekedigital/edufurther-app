'use client';

import { useState } from 'react';
import type { Mentor } from '@/types/mentor';

type Options = {
  /** This profile's mentor, once loaded. */
  mentor: Mentor | null;
  /** The viewer may book this profile's mentor (not the owner, not a mentor). */
  mayBook: boolean;
  /** The viewer may book at all (mentors can't; canBookFor). */
  canBook: boolean;
};

/**
 * Who the profile's BookingLauncher books, and where it opens: this
 * profile's mentor, or one suggested on the "isn't available" page. A
 * booking the viewer can no longer make (they turn out to be a mentor)
 * closes: the launcher then fetches nothing, and nothing shows.
 */
export function useProfileBooking({ mentor, mayBook, canBook }: Options) {
  const [booking, setBooking] = useState<Mentor | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  // A time to open on, from the first-mentees card's "Book {time}".
  const [time, setTime] = useState<string | null>(null);
  const allowed = !!booking && (booking.id === mentor?.id ? mayBook : canBook);

  const start = (m: Mentor | null, sessionTypeId?: string, at?: string) => {
    setTypeId(sessionTypeId ?? null);
    setTime(at ?? null);
    setBooking(m);
  };

  return {
    /** The mentor being booked while the modal may show; null otherwise. */
    active: allowed ? booking : null,
    /** It's this profile's mentor (its profile link would lead back here). */
    isThisMentor: !!booking && booking.id === mentor?.id,
    initialSessionTypeId: typeId,
    initialTime: time,
    /** Book this profile's mentor, optionally on a type or at a time. */
    open: (sessionTypeId?: string, at?: string) => start(mentor, sessionTypeId, at),
    /** Book a suggested mentor (the "isn't available" page). */
    openFor: (m: Mentor) => start(m),
    close: () => start(null),
  };
}
