import type { Booking } from '@/types/booking';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { MISSED_WAIT_FALLBACK_MIN, OUTCOME_COPY as C } from '@/lib/copy/session';
import { showedUp } from './bookings';

/**
 * Who missed a session that settled as missed, from the viewer's side. Read
 * from each party's recorded attendance, never from the clock. `unknown`:
 * there is no record (two migrated bookings), so nothing is claimed.
 */
export type MissedBy = 'me' | 'other' | 'both' | 'unknown';

export function missedBy(b: Booking): MissedBy {
  const came = showedUp(b);
  if (came === false) return 'both';
  if (came === null) return 'unknown';
  if (b.myAttendance === 'noShow') return 'me';
  if (b.other.attendance === 'noShow') return 'other';
  return 'unknown';
}

/**
 * The missed panel's ground, which the lobby above it shares (the design's
 * `miss.bg`): red when the viewer missed it, green when the mentor missed a
 * mentee's session (their credit is back), grey otherwise.
 */
export function missedTone(b: Booking): 'red' | 'green' | 'grey' {
  const who = missedBy(b);
  if (who === 'me') return 'red';
  if (who === 'other' && b.side === 'mentee') return 'green';
  return 'grey';
}

/**
 * How long each party was waited for: the backend's arrival rule, read from
 * the row (arrivals stop at `join_closes_at`) so the copy never states a
 * number the server doesn't apply.
 */
export function missedWaitMin(b: Booking): number {
  if (!b.joinClosesAt) return MISSED_WAIT_FALLBACK_MIN;
  return Math.round((new Date(b.joinClosesAt).getTime() - new Date(b.startsAt).getTime()) / 60_000);
}

export type OutcomeAction = {
  key: string;
  label: string;
  /** Where it goes; null for an action on this page (review and booking open modals here). */
  href: string | null;
  variant: 'primary' | 'secondary';
};

export type OutcomeView =
  | {
      kind: 'completed';
      /** Null once the viewer has reviewed here: the thanks line takes its place. */
      title: string | null;
      body: string | null;
      /** "Thanks, your review is on Gbenga’s profile." after a review sent from this page. */
      thanks: string | null;
      actions: OutcomeAction[];
    }
  | {
      kind: 'missed';
      /** The panel's ground and icon colour (Session Join.dc.html `miss`). */
      tone: 'red' | 'green' | 'grey';
      icon: IconName;
      title: string;
      body: string;
      /** The person who missed it is asked why (the design's `askReason`). */
      askReason: boolean;
      actions: OutcomeAction[];
    };

export type OutcomeInput = {
  booking: Booking;
  /** The viewer may book (mentors never do: `canBookFor`). */
  canBook: boolean;
  /**
   * Whether this session can still be reviewed (`/me/reviewable-sessions`).
   * `loading`: neither Leave a review nor Book again yet, as on Bookings (one
   * would stand in for the other a moment later). `error`: the check failed,
   * so a retry, and Book again, which doesn't depend on it.
   */
  reviewable: boolean | 'loading' | 'error';
  /** A review was sent from this page in this visit. */
  reviewed: boolean;
  /** The viewer's Home (`memberHome`), for the mentor's completed card. */
  home: string;
};

const BOOKINGS: OutcomeAction = {
  key: 'bookings',
  label: C.goBookings,
  href: '/bookings',
  variant: 'primary',
};

const FIND: OutcomeAction = {
  key: 'find',
  label: C.findMentor,
  href: '/explore',
  variant: 'secondary',
};

/**
 * The outcome block under the lobby once a session has settled (Session
 * Join.dc.html `isCompleted` / `isMissed`, with the founder's changes in PRD
 * Session Join). Booking again opens the booking modal on this page (`book`,
 * no link). Credit lines follow the backend's rule: a refund only when the
 * mentor alone was absent.
 */
export function outcomeView({
  booking: b,
  canBook,
  reviewable,
  reviewed,
  home,
}: OutcomeInput): OutcomeView {
  const first = b.other.firstName;
  const mentee = b.side === 'mentee';
  const book = (label: string, variant: OutcomeAction['variant']): OutcomeAction => ({
    key: 'book',
    label,
    href: null,
    variant,
  });

  if (b.status === 'completed') {
    if (!mentee)
      return {
        kind: 'completed',
        title: C.complete(first),
        body: null,
        thanks: null,
        actions: [{ key: 'home', label: C.goHome, href: home, variant: 'primary' }],
      };
    const again = canBook ? [book(C.bookAgain, 'primary')] : [BOOKINGS];
    // Sent from this page: the design's reviewedDone.
    if (reviewed)
      return {
        kind: 'completed',
        title: null,
        body: null,
        thanks: C.reviewThanks(first),
        actions: again,
      };
    const ask = { title: C.reviewTitle(first), body: C.reviewBody, thanks: null };
    const alsoBook = canBook ? [book(C.bookAgain, 'secondary')] : [];
    if (reviewable === 'loading') return { kind: 'completed', ...ask, actions: [] };
    if (reviewable === 'error')
      return {
        kind: 'completed',
        ...ask,
        body: C.reviewCheckFailed,
        actions: [
          { key: 'retryReview', label: C.tryAgain, href: null, variant: 'secondary' },
          ...alsoBook,
        ],
      };
    if (reviewable)
      return {
        kind: 'completed',
        ...ask,
        actions: [
          // Opens the review modal here, on this page.
          { key: 'review', label: C.leaveReview, href: null, variant: 'primary' },
          ...alsoBook,
        ],
      };
    // Reviewed already, or past the window for it. PROVISIONAL: undesigned.
    return {
      kind: 'completed',
      title: C.complete(first),
      body: null,
      thanks: null,
      actions: again,
    };
  }

  const who = missedBy(b);
  const min = missedWaitMin(b);
  const M = C.missed;
  const bookAnother = canBook ? [book(C.bookAnother, 'primary')] : [BOOKINGS];

  if (mentee) {
    if (who === 'me')
      return {
        kind: 'missed',
        tone: 'red',
        icon: 'event_busy',
        title: M.youMissed,
        body: M.menteeMissed(first, min),
        askReason: true,
        actions: bookAnother,
      };
    if (who === 'other')
      return {
        kind: 'missed',
        tone: 'green',
        icon: 'replay',
        title: M.didntJoin(first),
        body: M.mentorMissedForMentee,
        askReason: false,
        actions: canBook ? [FIND, book(C.bookMentorAgain(first), 'primary')] : [BOOKINGS],
      };
    if (who === 'both')
      return {
        kind: 'missed',
        tone: 'grey',
        icon: 'help',
        title: M.neither,
        body: M.neitherForMentee(min),
        askReason: false,
        actions: bookAnother,
      };
  } else {
    if (who === 'other')
      return {
        kind: 'missed',
        tone: 'grey',
        icon: 'person_off',
        title: M.didntJoin(first),
        body: M.menteeMissedForMentor(min),
        askReason: false,
        actions: [BOOKINGS],
      };
    // "Offer a new time" waits on the founder's open question: a suggested
    // time can't ride on a missed session yet, so Go to Bookings (PRD default).
    if (who === 'me')
      return {
        kind: 'missed',
        tone: 'red',
        icon: 'event_busy',
        title: M.youMissed,
        body: M.mentorMissed(first, min),
        askReason: true,
        actions: [BOOKINGS],
      };
    if (who === 'both')
      return {
        kind: 'missed',
        tone: 'grey',
        icon: 'help',
        title: M.neither,
        body: M.neitherForMentor(first, min),
        askReason: false,
        actions: [BOOKINGS],
      };
  }
  return {
    kind: 'missed',
    tone: 'grey',
    icon: 'help',
    title: M.unknownTitle,
    body: M.unknownBody,
    askReason: false,
    actions: [BOOKINGS],
  };
}
