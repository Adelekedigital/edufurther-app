'use client';

import { useMentorProfile } from '@/lib/api/data/profile';
import type { AvatarTone } from '@/types/mentor';
import { bookingMentorHandle } from './booking';

export type BookingContext = {
  /** "Gbenga E.": first name and last initial, as the design's context line names them. */
  mentorName: string;
  /** "Gbenga": as the design's toast names them. */
  firstName: string;
  initials: string;
  tone: AvatarTone;
  photoUrl: string | null;
  photoFocus: { x: number; y: number } | null;
};

/**
 * Who they were booking, when `next` is a booking (the reopen link, or a link
 * into onboarding with one). Read from the mentor's public profile; no mentor,
 * a profile that is gone or still loading: no context, and the page is as usual.
 */
export function useBookingContext(next: string | null): BookingContext | null {
  const handle = bookingMentorHandle(next);
  const profile = useMentorProfile(handle);
  if (!handle || !profile.data) return null;
  const { mentor, names } = profile.data;
  const last = names.last.trim();
  return {
    mentorName: last ? `${names.first} ${last[0]!.toUpperCase()}.` : names.first,
    firstName: names.first,
    initials: mentor.initials,
    tone: mentor.tone,
    photoUrl: mentor.photoUrl,
    photoFocus: mentor.photoFocus,
  };
}
