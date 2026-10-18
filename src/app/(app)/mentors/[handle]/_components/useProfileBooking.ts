'use client';

import { useState } from 'react';
import {
  useRequestBooking,
  useSessionTypes,
  useSlots,
  useUploadIntakeFile,
} from '@/lib/api/data/booking';
import type { Mentor } from '@/types/mentor';

type Options = {
  /** This profile's mentor, once loaded. */
  mentor: Mentor | null;
  /** The viewer may book this profile's mentor (not the owner, not a mentor). */
  mayBook: boolean;
  /** The viewer may book at all (mentors can't; canBookFor). */
  canBook: boolean;
  timeZone: string;
};

/**
 * The shared BookingModal's state on the profile, as on Explore. Who is being
 * booked: this profile's mentor, or one suggested on the "isn't available"
 * page. A booking the viewer can no longer make (they turn out to be a
 * mentor) closes: nothing is fetched for it, and nothing shows.
 */
export function useProfileBooking({ mentor, mayBook, canBook, timeZone }: Options) {
  const [booking, setBooking] = useState<Mentor | null>(null);
  const [bookingTypeId, setBookingTypeId] = useState<string | null>(null);
  // A time to open on, from the first-mentees card's "Book {time}".
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const allowed = !!booking && (booking.id === mentor?.id ? mayBook : canBook);
  const mentorId = allowed ? booking!.id : null;
  const sessionTypes = useSessionTypes(mentorId);
  const typeId = bookingTypeId ?? sessionTypes.data?.[0]?.id ?? null;
  const slots = useSlots(mentorId, typeId, timeZone);
  const request = useRequestBooking();
  const uploadIntakeFile = useUploadIntakeFile();

  /** Book this profile's mentor, optionally on a type or at a time. */
  const open = (sessionTypeId?: string, time?: string) => {
    setBookingTypeId(sessionTypeId ?? null);
    setBookingTime(time ?? null);
    request.reset();
    setBooking(mentor);
  };
  /** Book a suggested mentor (the "isn't available" page). */
  const openFor = (m: Mentor) => {
    setBookingTypeId(null);
    setBookingTime(null);
    request.reset();
    setBooking(m);
  };
  const close = () => {
    setBooking(null);
    setBookingTypeId(null);
    setBookingTime(null);
    request.reset();
  };

  return {
    /** The mentor being booked while the modal may show; null otherwise. */
    active: allowed ? booking : null,
    /** It's this profile's mentor (its profile link would lead back here). */
    isThisMentor: !!booking && booking.id === mentor?.id,
    sessionTypes,
    typeId,
    setTypeId: setBookingTypeId,
    slots,
    request,
    uploadIntakeFile,
    initialTime: bookingTime,
    open,
    openFor,
    close,
  };
}
