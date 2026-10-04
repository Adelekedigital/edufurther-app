/**
 * Another time a mentor offered when they declined or cancelled a booking
 * (`SessionRead.suggestion`, backend #339), as this screen reads it.
 *
 * Kept beside `types/booking.ts` rather than in it only because a parallel PR
 * owns that file; it is the same view model and belongs with `Booking`.
 */

/**
 * `active` while the time is held for this mentee alone; `booked` once they
 * took it; `expired` once the hold lapsed unbooked.
 *
 * The backend computes this on every read — `active` means `held_until` was
 * still ahead **when the row was fetched**. A row already in hand therefore
 * keeps saying `active` after its hold runs out, which is expected rather than
 * a bug: the clock is the truth for what to show, a re-read is the truth for
 * what it is.
 */
export type SuggestionStatus = 'active' | 'booked' | 'expired';

export type BookingSuggestion = {
  id: string;
  /** UTC instant. Rendered in the viewer's zone, never the stored one. */
  startsAt: string;
  /** UTC instant, derived from `starts_at` + `duration_minutes`, as `Booking.endsAt` is. */
  endsAt: string;
  durationMin: number;
  /** UTC instant the exclusive hold ends — two hours from the offer. */
  heldUntil: string;
  status: SuggestionStatus;
  /** The session it became, once `booked`. */
  bookedSessionId: string | null;
};
