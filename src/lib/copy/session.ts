/**
 * Session Join copy (`/sessions/[id]`): Session Join.dc.html's 19 Oct copy
 * pass, with the founder's changes (PRD Session Join, Oct 21): first names,
 * never pronouns; no "Booking pauses after 3."; no "we've told". Reviewed with
 * edufurther-ux-writer; no em dashes.
 */

import type { MissedReasonCode } from '@/lib/api/data/missedReason';
import type { SupportPerson } from '@/lib/utils/mailto';

export const LOBBY_COPY = {
  /** Under the locked Join button. */
  joinLockedHint: (min: number) => `The button becomes active ${min} minutes before the start.`,
  /** Join again, for someone who has been in. */
  rejoin: 'Rejoin call',
  reschedule: 'Reschedule',
  cancel: 'Cancel',
  /** Between the end and the attendance ruling (the settling phase). */
  settlingNote:
    'You’ve finished this session. We’re confirming who joined. Your booking updates when that’s done.',
} as const;

export const SUPPORT_FOOTER_COPY = {
  lead: 'Having a problem?',
  link: 'Contact support',
} as const;

/**
 * The footer's prefilled email to support (PRD: Frame), for `supportHref`.
 * `when` names its zone ("Mon, Sep 28, 6:00 – 6:30 pm Lagos (WAT)"): the page's
 * switcher may show another zone than the one support would assume.
 */
export function sessionSupportRequest(session: { sessionName: string; when: string }) {
  return {
    subject: (name: string) => `Session: please help (${name})`,
    body: (p: SupportPerson) =>
      [
        'Hi EduFurther team,',
        '',
        'I had a problem with my session.',
        '',
        'What happened:',
        '- ',
        '',
        `Session: ${session.sessionName}, ${session.when}`,
        `Name: ${p.name}`,
        `Role: ${p.mentor ? 'Mentor' : 'Mentee'}`,
        '',
        'Thanks,',
        p.firstName,
      ].join('\n'),
  };
}

/** Getting ready: the answers card, the quick guide and the phone buttons. */
export const PREP_COPY = {
  guideTitle: 'Quick guide',
  answersSub: {
    mentee: (mentorFirst: string) => `Your answers from booking. ${mentorFirst} sees them too.`,
    mentor: (menteeFirst: string) => `From ${menteeFirst}’s booking answers.`,
  },
  answersButton: {
    mentee: 'Your response',
    mentor: (menteeFirst: string) => `${menteeFirst}’s response`,
  },
  tips: {
    goal: {
      title: 'One clear goal',
      body: (minutes: number) =>
        `It helps to bring your questions and any drafts you’d like feedback on. You have ${minutes} minutes.`,
    },
    response: {
      title: (menteeFirst: string) => `Check ${menteeFirst}’s response`,
      body: (menteeFirst: string) =>
        `A quick look before the call helps you plan the session around what ${menteeFirst} needs.`,
    },
    setup: {
      title: 'Your setup',
      body: 'A quiet spot, headphones and a steady connection make the call easier for both of you.',
    },
    plans: {
      title: 'If plans change',
      body: (hours: number) =>
        `Canceling or rescheduling at least ${hours} hours before lets someone else book the time.`,
      // No deadline on the row: no number rather than a guessed one.
      bodyNoWindow: 'Canceling or rescheduling in good time lets someone else book the time.',
    },
  },
} as const;

/** The outcome under the lobby once a session has settled. */
export const OUTCOME_COPY = {
  reviewTitle: (mentorFirst: string) => `How was your session with ${mentorFirst}?`,
  reviewBody: 'Your review helps other mentees pick the right mentor.',
  reviewThanks: (mentorFirst: string) => `Thanks, your review is on ${mentorFirst}’s profile.`,
  reviewCheckFailed: 'We couldn’t check whether you can review this session.',
  complete: (otherFirst: string) => `Your session with ${otherFirst} is complete.`,
  leaveReview: 'Leave a review',
  bookAgain: 'Book again',
  tryAgain: 'Try again',
  goHome: 'Go to Home',
  goBookings: 'Go to Bookings',
  findMentor: 'Find another mentor',
  bookAnother: 'Book another time',
  bookMentorAgain: (mentorFirst: string) => `Book ${mentorFirst} again`,
  missed: {
    youMissed: 'You missed this session',
    didntJoin: (first: string) => `${first} didn’t join`,
    neither: 'Neither of you joined',
    unknownTitle: 'This session was missed',
    unknownBody: 'We don’t have a record of who joined.',
    // Mentee viewer.
    menteeMissed: (mentorFirst: string, min: number) =>
      `${mentorFirst} waited ${min} minutes from the start. The credit for this session is used, and it counts as a missed session.`,
    mentorMissedForMentee: 'Your credit is back.',
    neitherForMentee: (min: number) =>
      `Neither of you joined within ${min} minutes of the start, so the credit for this session is used.`,
    // Mentor viewer.
    menteeMissedForMentor: (min: number) =>
      `You waited ${min} minutes from the start, so this counts as a completed session for you.`,
    mentorMissed: (menteeFirst: string, min: number) =>
      `${menteeFirst} waited ${min} minutes from the start, so ${menteeFirst}’s credit is back.`,
    neitherForMentor: (menteeFirst: string, min: number) =>
      `Neither of you joined within ${min} minutes of the start, so ${menteeFirst}’s credit for this session is used.`,
  },
} as const;

/**
 * How long a party is waited for before they count as absent, when the row
 * has no `join_closes_at` to read it from (older rows): the backend's
 * `JOIN_CLOSES`, 15 minutes after the start (the PRD's "10" predates it).
 */
export const MISSED_WAIT_FALLBACK_MIN = 15;

/**
 * The missed-reason form (PRD Session Join, Missed): internal only (founder,
 * Oct 21), so no "{First} sees your answer" hint, and the thanks says nothing
 * about sharing. The codes are the backend's.
 */
export const MISSED_REASON_COPY = {
  question: 'What happened?',
  options: [
    { value: 'forgot', label: 'Forgot the time' },
    { value: 'technical', label: 'Technical problem' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'wrong_time_zone', label: 'Wrong time zone' },
    { value: 'other', label: 'Other' },
  ] satisfies readonly { value: MissedReasonCode; label: string }[],
  placeholder: 'Anything else we should know? (optional)',
  send: 'Send',
  thanks: 'Thanks for letting us know.',
  failed: 'We couldn’t send that. Try again in a moment.',
  /** The session doesn't take a reason from this viewer (a refusal a retry can't change). */
  closed: 'This session isn’t taking a reason from you.',
  /** The longest note the backend takes. */
  noteMax: 1000,
} as const;
