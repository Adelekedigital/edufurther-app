'use client';

import { useMentorProfile } from '@/lib/api/data/profile';
import type { CoverKey } from '@/lib/utils/cover';
import { bookingMentorHandle } from './booking';

export type BookingContext = {
  /** "Gbenga E.": first name and last initial, as the design's context line names them. */
  mentorName: string;
  /** "Gbenga": as the design's toast names them. */
  firstName: string;
  initials: string;
  cover: CoverKey;
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
  const first = names.first.trim();
  const last = names.last.trim();
  return {
    mentorName: last ? `${first} ${last[0]!.toUpperCase()}.` : first,
    firstName: first,
    initials: mentor.initials,
    cover: mentor.cover,
    photoUrl: mentor.photoUrl,
    photoFocus: mentor.photoFocus,
  };
}
