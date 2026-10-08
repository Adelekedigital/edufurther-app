import type { Booking } from '@/types/booking';
import type { IconName } from '@/components/atoms/Icon/iconNames';
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

export type OutcomeAction = {
  key: string;
  label: string;
  /** Where it goes; null for an action on this page (Leave a review opens the modal). */
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
      actions: OutcomeAction[];
    };

export type OutcomeInput = {
  booking: Booking;
  /** The viewer may book (mentors never do: `canBookFor`). */
  canBook: boolean;
  /**
   * Whether this session can still be reviewed (`/me/reviewable-sessions`).
   * Null while that is unknown, loading or failed: then neither Leave a
   * review nor Book again is offered, as on Bookings.
   */
  reviewable: boolean | null;
  /** A review was sent from this page in this visit. */
  reviewed: boolean;
};

const BOOKINGS: OutcomeAction = {
  key: 'bookings',
  label: 'Go to Bookings',
  href: '/bookings',
  variant: 'primary',
};

/**
 * The outcome block under the lobby once a session has settled (Session
 * Join.dc.html `isCompleted` / `isMissed`). Copy that claims what we can't
 * know or do is trimmed (logged in design-divergence.md): how long anyone
 * waited, that the other person was told, ranking, follow-up notes,
 * messaging, offering a new time. Credit lines follow the backend's rule:
 * a refund only when the mentor alone was absent.
 */
export function outcomeView({
  booking: b,
  canBook,
  reviewable,
  reviewed,
}: OutcomeInput): OutcomeView {
  const first = b.other.firstName;
  // The mentor's profile, where booking and reviewing happen. Only ever built
  // for the mentee's side, where the other party is the mentor.
  const profile = `/mentors/${encodeURIComponent(b.other.id)}`;
  const mentee = b.side === 'mentee';

  if (b.status === 'completed') {
    if (!mentee)
      return {
        kind: 'completed',
        title: 'Nice work. Session complete.',
        body: `${first} can leave a review on your profile.`,
        thanks: null,
        actions: [BOOKINGS],
      };
    const book: OutcomeAction = {
      key: 'book',
      label: 'Book again',
      href: profile,
      variant: 'secondary',
    };
    const again = canBook ? [{ ...book, variant: 'primary' as const }] : [BOOKINGS];
    // Sent from this page: the design's reviewedDone.
    if (reviewed)
      return {
        kind: 'completed',
        title: null,
        body: null,
        thanks: `Thanks, your review is on ${first}’s profile.`,
        actions: again,
      };
    const ask = {
      title: `How was your session with ${first}?`,
      body: 'Your review helps other mentees choose, and takes about a minute.',
      thanks: null,
    };
    if (reviewable === null) return { kind: 'completed', ...ask, actions: [] };
    if (reviewable)
      return {
        kind: 'completed',
        ...ask,
        actions: [
          // Opens the review modal here, on this page.
          { key: 'review', label: 'Leave a review', href: null, variant: 'primary' },
          ...(canBook ? [book] : []),
        ],
      };
    // Reviewed already, or past the window for it. PROVISIONAL: undesigned.
    return {
      kind: 'completed',
      title: `Your session with ${first} is complete.`,
      body: null,
      thanks: null,
      actions: again,
    };
  }

  const who = missedBy(b);
  const bookAgain = (label: string): OutcomeAction[] =>
    canBook ? [{ key: 'book', label, href: profile, variant: 'primary' }] : [BOOKINGS];

  if (who === 'other' && mentee)
    return {
      kind: 'missed',
      tone: 'green',
      icon: 'replay',
      title: `${first} didn’t join. Your credit is back.`,
      body: `We’re sorry. You weren’t charged for this session. Rebook with ${first} or try another mentor.`,
      actions: canBook
        ? [
            { key: 'find', label: 'Find another mentor', href: '/explore', variant: 'secondary' },
            { key: 'book', label: `Rebook with ${first}`, href: profile, variant: 'primary' },
          ]
        : [BOOKINGS],
    };
  if (who === 'other')
    return {
      kind: 'missed',
      tone: 'grey',
      icon: 'person_off',
      title: `${first} didn’t join`,
      body: `You joined, but ${first} didn’t. ${first} can book again.`,
      actions: [BOOKINGS],
    };
  if (who === 'me' && mentee)
    return {
      kind: 'missed',
      tone: 'red',
      icon: 'event_busy',
      title: 'You missed this session',
      body: `${first} joined, but you didn’t. Missed sessions aren’t refunded, but you can book another time.`,
      actions: bookAgain('Book another time'),
    };
  if (who === 'me')
    return {
      kind: 'missed',
      tone: 'red',
      icon: 'event_busy',
      title: 'You missed this session',
      body: `${first} joined, but you didn’t, so their credit is back.`,
      actions: [BOOKINGS],
    };
  if (who === 'both')
    return {
      kind: 'missed',
      tone: 'grey',
      icon: 'help',
      title: 'Neither of you joined',
      // PROVISIONAL: the design promised a refund here; the backend gives none.
      body: mentee
        ? 'This session isn’t refunded, but you can book another time.'
        : `${first} can book again.`,
      actions: mentee ? bookAgain('Book another time') : [BOOKINGS],
    };
  return {
    kind: 'missed',
    tone: 'grey',
    icon: 'help',
    title: 'This session was missed',
    body: 'We don’t have a record of who joined.',
    actions: [BOOKINGS],
  };
}
