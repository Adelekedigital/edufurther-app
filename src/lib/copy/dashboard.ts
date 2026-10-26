/**
 * Mentor Home copy (`/dashboard`): Mentor Dashboard v2.dc.html and PRD Mentor
 * Home (Oct 18, re-checked Oct 25). Reviewed with edufurther-ux-writer; no em
 * dashes.
 */

export const DASHBOARD_SUBLINE = {
  active: 'Here’s how your mentoring is going.',
  firstBooked: 'Your first session is coming up.',
  /** noBookings and notReady, and while the stage is still loading. */
  new: 'Let’s get your first session booked.',
  /** notReady with nothing left to set up: paused, unlisted or in review. */
  notLive: 'You’re not taking bookings right now.',
} as const;

export const HERO_COPY = {
  noBookings: {
    eyebrow: 'Get your first booking',
    title: 'You’re live. Let’s get your first booking.',
    body: 'Mentees can find you on Explore now. These moves help most in your first few weeks.',
  },
  firstBooked: {
    eyebrow: 'Your first session',
    title: 'Your first session is booked.',
    body: 'Get ready for it below. Your stats start after this session is complete.',
  },
  /** The meta line's tail on the first booking's card ("In 6 days · Your first booking"). */
  firstBookingNote: 'Your first booking',
  /** The upcoming sessions failed, so which hero applies isn't known. */
  bookingsError: 'We couldn’t load your bookings.',
  retry: 'Try again',
} as const;

export const STATUS_COPY = {
  listed: 'Listed on Explore',
  /** "Since Oct 18": the approval date in the account's zone. */
  listedSince: (date: string) => `Since ${date}`,
  /** Listed, but the approval date isn't known (an imported mentor). */
  listedNoDate: 'Live now',
  openTimes: 'Available times, next 14 days',
  requests: 'Booking requests',
  requestsNone: 'None yet',
  upcoming: 'Upcoming sessions',
  /** A row whose own query failed; the row still links. */
  failed: 'Couldn’t load',
} as const;

/** notReady with no setup step left: why the hero isn't there. */
export const NOT_LIVE_COPY = {
  breakTitle: 'You’re taking a break',
  breakBody: 'Mentees can’t find or book you until you’re back.',
  breakLink: 'Manage it on Calendar',
} as const;

/** The hero's "Do this week" moves (design `moveDefs`, tracking=none). */
export const MOVES_COPY = {
  heading: 'Do this week',
  counter: (done: number, total: number) => `${done} of ${total} done`,
  done: 'Done this week',
  share: {
    title: 'Share your profile',
    why: 'Post your link on LinkedIn or in a WhatsApp group you’re in. Mentees you already know are often the first to book.',
    action: 'Copy link',
  },
  about: {
    title: 'Lead your About with your result',
    why: 'A concrete outcome, like “Fully funded PhD”, tells mentees quickly what you can help with.',
    action: 'Edit About',
  },
  hours: {
    /** "available", not "open": ux-writer vocabulary (design says "open times"). */
    title: 'Keep at least 3 available times next week',
    why: 'Mentees who find you need a time they can pick.',
    action: 'Add hours',
  },
} as const;
