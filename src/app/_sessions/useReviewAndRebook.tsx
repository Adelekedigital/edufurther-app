'use client';

import { useMemo, useState } from 'react';
import { ReviewDialog } from '@/app/_reviews/ReviewDialog';
import { BookingLauncher } from '@/app/_shell/BookingLauncher/BookingLauncher';
import { useSendReview } from '@/lib/api/data/reviewWrite';
import { partyToMentor } from '@/lib/utils/bookableMentor';
import type { Booking } from '@/types/booking';
import type { ReviewableSession } from '@/types/mentor';

type Options = {
  /** The viewer may book at all (canBookFor): reviewing goes with booking. */
  canBook: boolean;
  /** The review's author line; no review dialog without one. */
  author: { firstName: string; initials: string } | null;
  /** Whose clock the review and the booking flow use. */
  timeZone: string;
  /**
   * The page's current copy of a booking, so an open modal follows it: a
   * mentor whose account goes while the flow is open takes the flow with them.
   * Undefined when the page doesn't hold it right now (the snapshot stands).
   */
  live: (bookingId: string) => Booking | null | undefined;
  /**
   * Where focus goes once a review is sent, when the button that opened it is
   * gone (the row's Book again, say). Without it focus falls to the page top.
   */
  focusAfterReview?: (bookingId: string) => HTMLElement | null;
};

/**
 * Leave a review and Book again, in place, on any page that lists a mentee's
 * sessions (Session Join, Bookings). One implementation, so the two pages
 * can't word, gate or sequence these differently: the review modal opens on
 * the page, its Book again closes it first, and the booking modal books the
 * session's mentor — never a deleted account, never for a viewer who can't
 * book ("one role per account").
 *
 * Whether a session is still reviewable stays the caller's question
 * (`useMyReviewableSessions`): the pages show different things while it loads.
 */
export function useReviewAndRebook({ canBook, author, timeZone, live, focusAfterReview }: Options) {
  const sendReview = useSendReview();
  // Held from the moment the modal opens: sending refreshes the reviewable
  // list, which then no longer has it, and the modal must stay for its thanks.
  const [reviewing, setReviewing] = useState<{
    booking: Booking;
    session: ReviewableSession;
  } | null>(null);
  // Sessions reviewed on this page: the page says so from then on, whatever
  // the list says next.
  const [reviewed, setReviewed] = useState<ReadonlySet<string>>(() => new Set());
  const [rebooking, setRebooking] = useState<Booking | null>(null);

  const canReview = (b: Booking) => b.side === 'mentee' && canBook;
  const canRebook = (b: Booking) => canReview(b) && !b.other.deleted;
  const current = (b: Booking) => live(b.id) ?? b;
  // No longer bookable (the account went, or the viewer turned out to be a
  // mentor): the flow goes too, so it never comes back unasked.
  if (rebooking && !canRebook(current(rebooking))) setRebooking(null);
  const party = rebooking?.other ?? null;
  const mentor = useMemo(() => (party ? partyToMentor(party) : null), [party]);

  const closeReview = () => {
    const sent = reviewing && sendReview.result ? reviewing : null;
    if (sent) setReviewed((s) => new Set(s).add(sent.session.id));
    sendReview.reset();
    setReviewing(null);
    return sent;
  };
  // After the modal's own focus return, which finds its opener gone.
  const refocus = (bookingId: string, then?: () => void) =>
    requestAnimationFrame(() => {
      focusAfterReview?.(bookingId)?.focus();
      then?.();
    });
  const bookAgain = (b: Booking) => {
    const now = current(b);
    if (canRebook(now)) setRebooking(now);
  };

  const r = reviewing;
  const rLive = r ? current(r.booking) : null;
  const dialogs = (
    <>
      {r && author && (
        <ReviewDialog
          mode="new"
          mentorFirstName={r.booking.other.firstName}
          sessions={[r.session]}
          editableUntil={sendReview.result?.editableUntil ?? null}
          author={{ name: author.firstName, initials: author.initials, institution: null }}
          timeZone={timeZone}
          onSend={(answers, sessionId) =>
            // As the profile does: a new review is always about a chosen session.
            sessionId &&
            sendReview.send({ mode: 'new', mentorId: r.booking.other.id, sessionId, answers })
          }
          pending={sendReview.isPending}
          error={sendReview.error?.message ?? null}
          done={!!sendReview.result}
          onClose={() => {
            if (closeReview()) refocus(r.booking.id);
          }}
          // Only while there is someone to book (the same gate as the modal's).
          onBookAgain={
            rLive && canRebook(rLive)
              ? () => {
                  // The booking modal returns focus to whatever had it as it
                  // opened, so the row's button takes it first.
                  if (closeReview()) refocus(r.booking.id, () => bookAgain(r.booking));
                  else bookAgain(r.booking);
                }
              : undefined
          }
        />
      )}
      <BookingLauncher
        mentor={mentor}
        timeZone={timeZone}
        // Rating and reviews aren't on the session row.
        ratingUnknown
        onClose={() => setRebooking(null)}
      />
    </>
  );

  return {
    /** A mentee's session, for a viewer who may review (and so book). */
    canReview,
    /** …and whose mentor can still be booked. */
    canRebook,
    /** Reviewed on this page (the list may still be catching up). */
    reviewedHere: (sessionId: string) => reviewed.has(sessionId),
    openReview: (booking: Booking, session: ReviewableSession) => {
      if (!canReview(booking)) return;
      sendReview.reset();
      setReviewing({ booking, session });
    },
    bookAgain,
    /** The review and booking modals; render once, anywhere on the page. */
    dialogs,
  };
}
