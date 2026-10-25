'use client';

import { useMemo, useState } from 'react';
import { ReviewDialog } from '@/app/_reviews/ReviewDialog';
import { BookingLauncher } from '@/app/_shell/BookingLauncher/BookingLauncher';
import { useSendReview } from '@/lib/api/data/reviewWrite';
import { partyToMentor } from '@/lib/utils/bookableMentor';
import type { Booking, BookingParty } from '@/types/booking';
import type { ReviewableSession } from '@/types/mentor';

type Options = {
  /** The viewer may book at all (canBookFor): reviewing goes with booking. */
  canBook: boolean;
  /** The review's author line; no review dialog without one. */
  author: { firstName: string; initials: string } | null;
  /** Whose clock the review and the booking flow use. */
  timeZone: string;
};

/**
 * Leave a review and Book again, in place, on any page that lists a mentee's
 * sessions (Session Join, Bookings). One implementation, so the two pages
 * can't word, gate or sequence these differently: the review modal opens on
 * the page, its Book again closes it first, and the booking modal books the
 * session's mentor — never a deleted account, never for a viewer who can't
 * book ("one role per account").
 *
 * Whether a session can still be reviewed stays the caller's question
 * (`useMyReviewableSessions`): the pages show different things while it loads.
 */
export function useReviewAndRebook({ canBook, author, timeZone }: Options) {
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
  const [rebooking, setRebooking] = useState<BookingParty | null>(null);

  const canRebook = (b: Booking) => b.side === 'mentee' && canBook && !b.other.deleted;
  // No longer bookable (the viewer turned out to be a mentor): the flow goes
  // too, so it never comes back unasked.
  if (rebooking && !canBook) setRebooking(null);
  const mentor = useMemo(() => (rebooking ? partyToMentor(rebooking) : null), [rebooking]);

  const closeReview = () => {
    const sent = reviewing && sendReview.result ? reviewing.session.id : null;
    if (sent) setReviewed((s) => new Set(s).add(sent));
    sendReview.reset();
    setReviewing(null);
  };
  const bookAgain = (b: Booking) => {
    if (canRebook(b)) setRebooking(b.other);
  };

  const r = reviewing;
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
          onClose={closeReview}
          // Only while there is someone to book (the same gate as the modal's).
          onBookAgain={
            canRebook(r.booking)
              ? () => {
                  closeReview();
                  bookAgain(r.booking);
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
    /** A mentee's session whose mentor can be booked again by this viewer. */
    canRebook,
    /** Reviewed on this page (the list may still be catching up). */
    reviewedHere: (sessionId: string) => reviewed.has(sessionId),
    openReview: (booking: Booking, session: ReviewableSession) => {
      sendReview.reset();
      setReviewing({ booking, session });
    },
    bookAgain,
    /** The review and booking modals; render once, anywhere on the page. */
    dialogs,
  };
}
