'use client';

import { lazyPart } from '@/components/molecules/LazyPart/lazyPart';
import type { EntryPoint } from '@/lib/analytics/events';
import type { Mentor } from '@/types/mentor';

// The booking flow, its hooks and its modal are the heaviest thing on the
// pages that offer them, and none of it is needed until someone presses Book:
// it loads on open (performance budget, 350kB first-load JS) and mounts whole,
// so its focus handling is unchanged (lazyPart: its own Suspense and error
// boundaries, a retry and a preload).
const OpenBooking = lazyPart(() => import('./OpenBooking').then((m) => m.OpenBooking));

export type BookingLauncherProps = {
  /** The mentor to book; null closes the flow. */
  mentor: Mentor | null;
  /** Which surface this is (PRD 30): sent with the request and on the booking events. */
  entryPoint: EntryPoint;
  /**
   * A guest signs up after choosing a time; on member screens this is false.
   * Null while the viewer loads (SignInBookingFlow decides on the first answer).
   */
  isGuest?: boolean | null;
  /** Whose clock the times are in: the account's zone where known, else the device's. */
  timeZone?: string;
  /** Hide the flow's "View profile" link (e.g. a mentor with no public profile). */
  hideProfileLink?: boolean;
  /** The mentor's rating/reviews aren't known (e.g. a met mentor from /me/mentors). */
  ratingUnknown?: boolean;
  onClose: () => void;
  /** The flow closed after the request went through (onboarding then goes Home, PRD US-5). */
  onBooked?: () => void;
  /** A booking picked before sign-up (onboarding's guest path, PRD US-6). */
  initialTime?: string | null;
  initialSessionTypeId?: string | null;
  /** Open past the time step, on the questions. */
  startAfterTime?: boolean;
};

/**
 * Opens the Explore booking modal (BookingFlow) for any `mentor`, so every
 * screen books the same way (OpenBooking). Mounted with `mentor=null` when
 * closed, which renders nothing and loads nothing.
 */
export function BookingLauncher({ mentor, ...rest }: BookingLauncherProps) {
  if (!mentor) return null;
  return <OpenBooking mentor={mentor} {...rest} />;
}
