import type { IconName } from '@/components/atoms/Icon/iconNames';
import { supportMailto } from '@/lib/utils/mailto';

/**
 * /mentor-application, word for word from the Mentor Onboarding PRD ("Flow
 * and screens", Update 18 Oct) and Approved.dc.html's saved defaults. Lines
 * marked PROVISIONAL are ours (edufurther-ux-writer), for states the design
 * doesn't draw.
 */

/** "Application sent" (mentor onboarding) and "In review" share these. */
export const NEXT_STEPS: readonly { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'fact_check',
    title: 'We review your background',
    body: 'We check your education and may reach out on LinkedIn or by email.',
  },
  {
    icon: 'mail',
    title: 'You hear from us by email',
    body: 'Approved or not, we’ll tell you either way.',
  },
  {
    icon: 'travel_explore',
    title: 'You’re listed on Explore',
    body: 'Once approved, mentees can find and book you straight away.',
  },
];

export const IN_REVIEW_COPY = {
  title: 'Your application is in review',
  body: (email: string) => `We’ll email you at ${email} when there’s an update.`,
  /** The first arrival, straight from Submit (PRD "Sent"). */
  sentTitle: (first: string) => (first ? `Application sent, ${first}` : 'Application sent'),
  sentBody: (email: string) =>
    `We’ll review your background and email you at ${email} when there’s an update.`,
  /** The reviewed fields are frozen until the decision (owner, 18 Oct); setup isn't. */
  whileYouWait: 'While you wait, you can set up your sessions and hours.',
} as const;

export const APPROVED_COPY = {
  badge: 'Profile approved',
  title: (first: string) => `You’re in, ${first}. Let’s get you booked.`,
  body: 'We set things up from your application. Mentees can find and book you now. Check your hours any time.',
  hoursTitle: 'Weekly hours drafted',
  hoursBody: (hours: string, zone: string) => `${hours} (${zone}). Change them any time.`,
  hoursLink: 'Check hours',
  introTitle: 'Intro chat is ready to book',
  introBody: 'Free, 30 min, 1:1 video. Add more sessions later.',
  introLink: 'Edit',
  listedTitle: 'You’re listed on Explore',
  listedBody: 'Mentees can find and book you straight away.',
  calendarTitle: 'Connect Google Calendar',
  calendarOptional: '(optional)',
  calendarBody: 'We hide times you’re already busy. Event details stay private.',
  go: 'Go to my dashboard',
} as const;

/**
 * The approved screen's Google Calendar row once it connects in place (owner,
 * 2026-10-18; edufurther-ux-writer). Wording follows Integrations, which still
 * manages the connection.
 */
export const CALENDAR_ROW_COPY = {
  connectedTitle: 'Google Calendar connected',
  connectedAs: (email: string) => `Connected as ${email}. We hide times you’re already busy.`,
  connectedBody: 'We hide times you’re already busy. Event details stay private.',
  connected: 'Connected',
  connect: 'Connect',
  connecting: 'Connecting…',
  reconnect: 'Reconnect',
  retry: 'Try again',
  blocked: 'Your browser blocked the pop-up. Allow pop-ups for EduFurther, then try again.',
  nothingConnected:
    'Nothing was connected. The window closed, or the calendar permission wasn’t ticked on Google’s second step.',
  offline: 'You’re offline. Reconnect to the internet, then try again.',
  failed: 'We couldn’t start connecting. Try again in a moment.',
  unavailable: 'Connecting a calendar isn’t available yet.',
  checkFailed: 'We couldn’t check whether your calendar is connected.',
  checking: 'Checking…',
  revoked: 'Google Calendar needs reconnecting. Access was removed or has expired.',
  broken: 'Google Calendar needs reconnecting.',
  announceConnected:
    'Google Calendar connected. Your busy times are now hidden from your booking page.',
} as const;

/** Mentor Dashboard v2.dc.html `?toast=approved`: the approved screen was already seen. */
export const ALREADY_APPROVED_TOAST = 'You’re already approved';

export const NOT_APPROVED_COPY = {
  title: 'Your application wasn’t approved this time',
  body: (first: string) =>
    `Thanks for applying, ${first}. Here’s what our reviewer said, and what you can do next.`,
  noteFrom: 'From the review team',
  againTitle: 'Want to apply again?',
  againBody:
    'Tell us what’s changed, like an updated LinkedIn or new details, and we’ll take another look.',
  contact: 'Contact us',
  sentTo: (email: string) => `We also sent this to ${email}.`,
  menteeLead: 'You can also use EduFurther as a mentee with the same account.',
  mentee: 'Continue as a mentee',
  /** PROVISIONAL: the role switch failed. */
  menteeError: 'That didn’t go through. Your mentor application is still saved. Try again.',
} as const;

export const STATUS_PAGE_COPY = {
  /** PROVISIONAL: GET /me failed. */
  loadErrorTitle: 'We couldn’t load your application',
  loadErrorBody: 'Your application is safe. Check your connection and try again.',
  retry: 'Try again',
  /** PROVISIONAL: for screen readers while /me loads. */
  loading: 'Loading your application…',
} as const;

/**
 * "Contact us" (PRD: Not approved): a mailto with the subject and body filled
 * in, every part URL-encoded. The applicant writes what changed under the dash.
 */
export function reapplyMailto(a: {
  name: string;
  email: string;
  reviewDate: string;
  note: string;
  first: string;
}): string {
  const subject = `Mentor application: please review again (${a.name})`;
  const body = [
    'Hi EduFurther team,',
    '',
    'Please take another look at my mentor application.',
    '',
    'What I’ve changed since the review:',
    '- ',
    '',
    `Name: ${a.name}`,
    `Account email: ${a.email}`,
    `Review date: ${a.reviewDate}`,
    `Reviewer’s note: ${a.note}`,
    '',
    'Thanks,',
    a.first,
  ].join('\n');
  return supportMailto(subject, body);
}
