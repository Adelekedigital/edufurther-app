import type { WireEmailRecipient, WireEmailSummary, WireEmailValue } from '@/lib/api/data/pending';

/**
 * MOCK of the Admin Emails registry (PRD 28). PENDING BACKEND.
 *
 * Seeded from the backend's real registry on development (9 Nov 2026):
 * `TEMPLATE_GROUPS` and the default `LINES` in `domain/email_lines.py`, and the
 * resolver names in `docs/loops-template-variables.md`. Names, triggers,
 * meanings and fallbacks are drafts for the mock; the backend's registry owns
 * the real words. The design's 27 rows are a draft too (designer item 86).
 */

type Line = { subject: string; heading: string; button: string };
type Variant = { id: string; label: string; lines: Line | null };
export type MockEmail = {
  key: string;
  name: string;
  trigger: string;
  group: string;
  group_name: string;
  template_name: string;
  recipients: WireEmailRecipient[];
  /** Live: a shared template; else its wording is still in Loops. */
  live: boolean;
  values: string[];
  variants: Variant[];
  last_edited: { admin_name: string; at: string } | null;
};

const SESSION = [
  'recipientName',
  'mentorName',
  'menteeName',
  'sessionDate',
  'sessionTime',
  'sessionTimezone',
  'sessionTopic',
];
const L = (subject: string, heading: string, button: string): Line => ({
  subject,
  heading,
  button,
});
const one = (lines: Line | null): Variant[] => [{ id: 'default', label: '', lines }];

type Seed = Omit<MockEmail, 'group' | 'group_name' | 'template_name' | 'live' | 'last_edited'> & {
  last_edited?: MockEmail['last_edited'];
};

/** A shared template's emails: Live, their lines from code. */
const shared = (group: string, group_name: string, emails: Seed[]): MockEmail[] =>
  emails.map((e) => ({
    ...e,
    group,
    group_name,
    template_name: group,
    live: true,
    last_edited: e.last_edited ?? null,
  }));

/** An email with its own template: a group of one, Not set up, wording still in Loops. */
const ownTemplate = (e: Omit<Seed, 'variants'> & { variants?: Variant[] }): MockEmail => ({
  ...e,
  variants: e.variants ?? one(null),
  group: e.key,
  group_name: e.name,
  template_name: e.key,
  live: false,
  last_edited: null,
});

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const MOCK_EMAILS: MockEmail[] = [
  ...shared('session_confirmed', 'Sessions confirmed', [
    {
      key: 'session_booked',
      name: 'Session booked',
      trigger: 'A booking is confirmed straight away',
      recipients: ['mentor', 'mentee'],
      values: [...SESSION, 'location', 'sessionDetail'],
      variants: [
        {
          id: 'mentee',
          label: 'To the mentee',
          lines: L(
            'Your session with {mentorName} is booked',
            "You're booked with {mentorName}",
            'View session',
          ),
        },
        {
          id: 'mentor',
          label: 'To the mentor',
          lines: L(
            'New session booked with {menteeName}',
            '{menteeName} booked a session with you',
            'View session',
          ),
        },
      ],
      last_edited: { admin_name: 'Ada Okeke', at: daysAgo(3) },
    },
    {
      key: 'request_accepted',
      name: 'Request accepted',
      trigger: 'The mentor accepts a request',
      recipients: ['mentee'],
      values: [...SESSION, 'location'],
      variants: one(
        L(
          '{mentorName} accepted your request',
          'Your session with {mentorName} is confirmed',
          'View session',
        ),
      ),
    },
  ]),
  ...shared('request_awaiting', 'Requests waiting', [
    {
      key: 'session_requested',
      name: 'Session requested',
      trigger: 'A mentee asks for a session that needs approval',
      recipients: ['mentor'],
      values: [...SESSION, 'hours', 'sessionDetail'],
      variants: one(
        L(
          'New session request from {menteeName}',
          '{menteeName} requested a session with you',
          'Review request',
        ),
      ),
    },
    {
      key: 'mentor_response_reminder',
      name: 'Request reminder',
      trigger: 'A request is still waiting before it expires',
      recipients: ['mentor'],
      values: [...SESSION, 'hours'],
      variants: one(
        L(
          '{menteeName} is waiting for your answer',
          '{hours} hours left to answer {menteeName}',
          'Review request',
        ),
      ),
    },
    {
      key: 'mentee_request_reminder',
      name: 'Mentee nudge',
      trigger: 'The mentee sends the mentor a reminder',
      recipients: ['mentor'],
      values: [...SESSION, 'reminderMessage'],
      variants: one(
        L(
          '{menteeName} sent you a reminder',
          '{menteeName} is waiting to hear from you',
          'Review request',
        ),
      ),
    },
  ]),
  ...shared('request_closed', 'Requests closed', [
    {
      key: 'request_declined',
      name: 'Request declined',
      trigger: 'The mentor declines a request',
      recipients: ['mentee'],
      values: [...SESSION, 'reasonTitle', 'reasonMessage'],
      variants: one(
        L(
          "{mentorName} can't take your session request",
          'Your session request was declined',
          'Find a mentor',
        ),
      ),
    },
    {
      key: 'request_withdrawn',
      name: 'Request withdrawn',
      trigger: 'The mentee withdraws a request',
      recipients: ['mentor'],
      values: [...SESSION, 'reasonTitle', 'reasonMessage'],
      variants: one(
        L(
          '{menteeName} withdrew their session request',
          'A session request was withdrawn',
          'Open dashboard',
        ),
      ),
    },
  ]),
  ...shared('session_reminders', 'Session reminders', [
    {
      key: 'session_reminder',
      name: 'Session reminder',
      trigger: 'The day before a session',
      recipients: ['mentor', 'mentee'],
      values: [...SESSION, 'attendee', 'intervalTime'],
      variants: one(
        L(
          'Reminder: your session with {attendee}',
          'Your session is happening {intervalTime}',
          'View session',
        ),
      ),
    },
    {
      key: 'session_last_reminder',
      name: 'Last reminder',
      trigger: 'Minutes before a session',
      recipients: ['mentor', 'mentee'],
      values: [...SESSION, 'attendee', 'intervalTime'],
      variants: one(
        L(
          'Your session with {attendee} starts soon',
          'Your session starts in a few minutes',
          'Go to session',
        ),
      ),
    },
  ]),
  ...shared('suggested_time', 'Suggested times', [
    {
      key: 'session_time_suggested',
      name: 'New time suggested',
      trigger: 'The mentor suggests a different time',
      recipients: ['mentee'],
      values: [...SESSION, 'suggestedDate', 'suggestedTime', 'holdUntilTime'],
      variants: one(
        L(
          '{mentorName} suggested a new time',
          '{mentorName} suggested another time for your session',
          'Book the new time',
        ),
      ),
    },
    {
      key: 'session_suggestion_reminder',
      name: 'Suggested time reminder',
      trigger: 'A suggested time is still held',
      recipients: ['mentee'],
      values: [...SESSION, 'suggestedDate', 'suggestedTime', 'holdUntilTime'],
      variants: one(
        L(
          'Your suggested time is held until {holdUntilTime}',
          'The time {mentorName} suggested is still free',
          'Book the new time',
        ),
      ),
    },
  ]),
  ...shared('credits', 'Credits', [
    {
      key: 'credits_granted',
      name: 'Credits granted',
      trigger: 'An admin adds credits',
      recipients: ['mentee'],
      values: ['recipientName', 'recipientFirstName'],
      variants: one(
        L('Your session credits are here', 'You have credits to book a session', 'Find a mentor'),
      ),
      last_edited: { admin_name: 'Chidi Eze', at: daysAgo(12) },
    },
    {
      key: 'credits_renewed',
      name: 'Credits renewed',
      trigger: 'Monthly credits renew on the 1st',
      recipients: ['mentee'],
      values: ['recipientName', 'recipientFirstName', 'creditCount'],
      variants: one(
        L(
          'Your credits for this month are ready',
          'You have new credits this month',
          'Find a mentor',
        ),
      ),
    },
    {
      key: 'credits_expiring',
      name: 'Credits expiring',
      trigger: 'Days before unused credits expire',
      recipients: ['mentee'],
      values: ['recipientName', 'recipientFirstName', 'creditCount', 'intervalTime'],
      variants: one(
        L('Your credits expire soon', 'Use your credits before they expire', 'Book a session'),
      ),
    },
  ]),
  ...shared('mentor_status', 'Mentor status', [
    {
      key: 'mentor_approved',
      name: 'Mentor approved',
      trigger: 'An admin approves an application',
      recipients: ['mentor'],
      values: ['recipientName', 'recipientFirstName'],
      variants: one(
        L(
          "You're approved as an EduFurther mentor",
          'Welcome aboard, {recipientFirstName}',
          'Get started',
        ),
      ),
      last_edited: { admin_name: 'Ada Okeke', at: daysAgo(14) },
    },
    {
      key: 'mentor_declined',
      name: 'Mentor not approved',
      trigger: 'An admin declines an application',
      recipients: ['mentor'],
      values: ['recipientName', 'recipientFirstName'],
      variants: one(
        L(
          'An update on your mentor application',
          "Your mentor application wasn't approved",
          'View application',
        ),
      ),
    },
    {
      key: 'mentor_paused_by_admin',
      name: 'Profile paused',
      trigger: 'An admin pauses a mentor',
      recipients: ['mentor'],
      values: ['recipientName', 'recipientFirstName'],
      variants: one(
        L('Your mentor profile is paused', "We've paused your mentor profile", 'Open dashboard'),
      ),
    },
  ]),
  ...shared('messages', 'Messages', [
    {
      key: 'message_unread_few',
      name: 'Unread messages',
      trigger: 'One or two messages stay unread',
      recipients: ['mentor', 'mentee'],
      values: ['recipientName', 'recipientFirstName', 'repliesName', 'unreadCount', 'previewText'],
      variants: [
        {
          id: 'one_message',
          label: '1 message',
          lines: L(
            '{repliesName} sent you a message',
            '{repliesName} sent you a message',
            'Reply in Messages',
          ),
        },
        {
          id: 'two_from_one',
          label: '2 from one person',
          lines: L(
            '{unreadCount} new messages from {repliesName}',
            '{repliesName} sent you {unreadCount} messages',
            'Reply in Messages',
          ),
        },
        {
          id: 'two_from_two',
          label: 'From two people',
          lines: L(
            'You have {unreadCount} unread messages on EduFurther',
            'You have {unreadCount} unread messages',
            'Open Messages',
          ),
        },
      ],
    },
    {
      key: 'message_unread_many',
      name: 'Many unread messages',
      trigger: 'Three or more messages stay unread',
      recipients: ['mentor', 'mentee'],
      values: ['recipientName', 'recipientFirstName', 'unreadCount', 'senderFirstNames'],
      variants: one(
        L(
          'You have {unreadCount} unread messages on EduFurther',
          '{senderFirstNames} sent you {unreadCount} messages',
          'Open Messages',
        ),
      ),
    },
    {
      key: 'message_in_session_window',
      name: 'Message near a session',
      trigger: 'A message arrives close to a session',
      recipients: ['mentor', 'mentee'],
      values: ['recipientName', 'recipientFirstName', 'senderFirstName', 'previewText'],
      variants: one(
        L(
          '{senderFirstName} sent you a message about your session',
          '{senderFirstName} sent you a message',
          'Reply in Messages',
        ),
      ),
    },
  ]),
  ownTemplate({
    key: 'session_cancelled',
    name: 'Session canceled',
    trigger: 'Either side cancels a booking',
    recipients: ['mentor', 'mentee'],
    values: [...SESSION, 'cancelInitiator', 'reasonMessage'],
  }),
  ownTemplate({
    key: 'request_expired',
    name: 'Request expired',
    trigger: 'The mentor doesn’t answer in time',
    recipients: ['mentee'],
    values: SESSION,
  }),
  ownTemplate({
    key: 'calendar_disconnected',
    name: 'Calendar disconnected',
    trigger: 'A mentor’s calendar stops syncing',
    recipients: ['mentor'],
    values: ['recipientName', 'recipientFirstName'],
  }),
  ownTemplate({
    key: 'review_requested',
    name: 'Review request',
    trigger: 'Right after a completed session',
    recipients: ['mentee'],
    values: SESSION,
  }),
  ownTemplate({
    key: 'review_received',
    name: 'New review',
    trigger: 'A mentee posts a review',
    recipients: ['mentor'],
    values: SESSION,
  }),
  ownTemplate({
    key: 'mentor_application_received',
    name: 'Application received',
    trigger: 'A mentor submits an application',
    recipients: ['mentor', 'admins'],
    values: ['recipientName', 'recipientFirstName', 'mentorName'],
    variants: [
      { id: 'mentor', label: 'To the mentor', lines: null },
      { id: 'admins', label: 'To admins', lines: null },
    ],
  }),
  ownTemplate({
    key: 'mentor_return_reminder',
    name: 'Return reminder',
    trigger: 'The morning a busy mentor said they’d be back',
    recipients: ['mentor'],
    values: ['recipientName', 'recipientFirstName'],
  }),
  ownTemplate({
    key: 'sign_in_code',
    name: 'Sign-in code',
    trigger: 'Someone asks for a code to log in or sign up',
    recipients: ['mentor', 'mentee'],
    values: ['code'],
    // PRD 28 Q1: two variants, subject and heading only, until designer item 91 settles.
    variants: [
      { id: 'log_in', label: 'To log in', lines: null },
      { id: 'sign_up', label: 'To sign up', lines: null },
    ],
  }),
];

/** [meaning, example, fallback]. `code` has no fallback. */
const VALUES: Record<string, [string, string, string | null]> = {
  recipientName: ['Full name of the person getting the email', 'Amara Okafor', 'there'],
  recipientFirstName: ['First name of the person getting the email', 'Amara', 'there'],
  mentorName: ['The mentor’s full name', 'Tunde Bakare', 'your mentor'],
  menteeName: ['The mentee’s full name', 'Amara Okafor', 'your mentee'],
  attendee: ['The other person in the session', 'Tunde Bakare', 'your mentor'],
  sessionDate: ['Session date, in the recipient’s time zone', 'Tue, Nov 18', 'the scheduled date'],
  sessionTime: ['Start time, in the recipient’s time zone', '3:00 pm', 'the scheduled time'],
  sessionTimezone: ['The time zone those are shown in', 'WAT', 'your time zone'],
  sessionTopic: ['What the session is about', 'CV review', 'your session'],
  sessionDetail: ['What the mentee wants to discuss', 'My personal statement', 'your notes'],
  location: ['Where the session happens', 'Google Meet', 'online'],
  hours: ['Hours left to answer the request', '12', 'a few'],
  intervalTime: ['How soon the session starts', 'Tomorrow', 'soon'],
  reminderMessage: ['The mentee’s note with the reminder', 'Just checking in', 'a reminder'],
  reasonTitle: ['The reason, in words', 'Schedule conflict', 'a change of plans'],
  reasonMessage: ['What the person wrote', 'Sorry, I’m traveling that week', 'no message'],
  cancelInitiator: ['Who canceled: the mentor or the mentee', 'Tunde', 'someone'],
  suggestedDate: ['The suggested date, in the mentee’s time zone', 'Wed, Nov 19', 'a new date'],
  suggestedTime: ['The suggested time, in the mentee’s time zone', '4:00 pm', 'a new time'],
  holdUntilTime: ['When the held time is released', '6:00 pm', 'soon'],
  creditCount: ['Credits in this change', '3', 'new'],
  repliesName: ['Who sent the unread messages', 'Tunde', 'Someone'],
  unreadCount: ['How many messages are unread', '2', 'new'],
  senderFirstNames: ['First names of the people who wrote', 'Tunde and Ifeoma', 'People'],
  senderFirstName: ['First name of the person who wrote', 'Tunde', 'Someone'],
  previewText: ['The start of the newest message', 'Can we move to 4pm?', 'a new message'],
  code: ['The 6-digit sign-in code', '482 913', null],
};

export function mockEmailList(): WireEmailSummary[] {
  return MOCK_EMAILS.map((e) => ({
    key: e.key,
    name: e.name,
    trigger: e.trigger,
    group: e.group,
    group_name: e.group_name,
    template_name: e.template_name,
    recipients: e.recipients,
    status: e.live ? 'live' : 'not_set_up',
    last_edited: e.last_edited,
  }));
}

export function mockEmailValues(): WireEmailValue[] {
  return Object.entries(VALUES).map(([name, [meaning, example, fallback]]) => ({
    name,
    meaning,
    example,
    fallback,
    used_in: MOCK_EMAILS.filter((e) => e.values.includes(name)).map((e) => e.name),
  }));
}
