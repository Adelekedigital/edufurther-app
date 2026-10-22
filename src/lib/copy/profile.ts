import { formatShortDate } from '@/lib/utils/format';
import { MENTOR_PROFILE_ERRORS } from './mentorSettings';

/**
 * The owner's Edit profile form on the Mentor Profile (Mentor Profile.dc.html
 * `editingIntro`): one error per missing field. The headline's two are
 * Settings' own, so both forms always say the same.
 */
/** The share menu's line for an owner whose profile isn't public (`shareNote`). */
export const SHARE_NOTE = {
  pending:
    'Only you can see this page until you’re approved. Others see “This mentor profile isn’t available”.',
  hidden: 'Only you can see this page. Others see “This mentor profile isn’t available”.',
} as const;

/**
 * The Reviews tab's note (Mentor Profile.dc.html reviewState). `due` names the
 * session a new review starts on ("Your review on Sep 19 (SOP review) helps
 * …"), in the profile's zone; brackets only with a session name, and the
 * plain line while no session is known yet. `again`: the design's "3 more
 * sessions" has no count behind it (the API says only "2 or more since"), so
 * the title doesn't name one.
 */
export const REVIEW_COPY = {
  dueTitle: (firstName: string) => `How was your session with ${firstName}?`,
  dueBody: (
    session: { startsAt: string; typeName: string | null } | null,
    timeZone: string,
  ): string => {
    if (!session) return 'Your review helps other mentees choose, and takes about a minute.';
    const day = formatShortDate(session.startsAt, timeZone);
    const name = session.typeName?.trim();
    return `Your review on ${day}${name ? ` (${name})` : ''} helps other mentees choose, and takes about a minute.`;
  },
  dueAction: 'Write a review',
  againTitle: 'You’ve had more sessions since your last review',
  againBody: (firstName: string, lastReviewedAt: string, now = new Date()) => {
    const at = new Date(lastReviewedAt);
    const month = at.toLocaleString('en-US', {
      month: 'long',
      ...(at.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
    });
    return `You last reviewed ${firstName} in ${month}. An update shows mentees how the mentoring has gone over time.`;
  },
  againAction: 'Update your review',
} as const;

export const INTRO_ERRORS = {
  firstName: 'Add your first name.',
  lastName: 'Add your last name.',
  headline: MENTOR_PROFILE_ERRORS.headline,
  headlineTooLong: MENTOR_PROFILE_ERRORS.headlineTooLong,
} as const;

/** A mentor who can't be booked now: the profile, Explore, Similar mentors and Home all say it. */
export const NOT_TAKING_TITLE = 'Not taking bookings';

/**
 * How booking a session works (Mentor Profile.dc.html `cfLabel`, `cfAria`): the
 * label, then what it means, read after it by screen readers.
 */
export const BOOKING_MODE = {
  instant: { label: 'Instant booking', detail: 'confirmed right away' },
  request: { label: 'Request to book', detail: 'the mentor approves each booking' },
} as const;

/** The booking card's subtitle with several sessions (Mentor Profile.dc.html `sessionsSub`). */
export const bookSessionsSub = (count: number, zone: string) =>
  `${count} sessions · times in ${zone}`;

/** The declined owner bar's "Contact support": the mail's subject. */
export const OWNER_SUPPORT_SUBJECT = (name: string) =>
  `My mentor profile wasn’t approved (${name})`;

/** The Reviews tab with nothing to list (Mentor Profile.dc.html `emptyText`). */
export const REVIEWS_EMPTY = {
  all: 'No reviews yet.',
  filtered: 'No reviews for this session yet.',
} as const;

/**
 * The "isn't available" page's suggestions (Mentor Profile.dc.html notFound).
 * The design's "Mentors mentees are booking this week" claims a demand the API
 * doesn't rank by: these are mentors with open times (backend #521).
 */
export const NOT_FOUND_COPY = {
  similarTitle: 'Mentors with similar expertise',
  freeSoonTitle: 'Mentors you can book this week',
  freeSoonSub: 'All have open times in the next 7 days.',
} as const;
