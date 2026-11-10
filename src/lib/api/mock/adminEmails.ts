import type {
  WireEmailDetail,
  WireEmailLine,
  WireEmailLineError,
  WireEmailRecipient,
  WireEmailSave,
  WireEmailSummary,
  WireEmailValue,
  WireEmailVariant,
  WireLineKey,
} from '@/lib/api/data/adminEmails';
import { checkLine, LINE_KEYS } from '@/lib/utils/emailLines';
import type { ErrorStatus, MockResult, ProblemBody } from './respond';

/**
 * MOCK of the Admin Emails registry (PRD 28), typed by the published spec.
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
  'sessionName',
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
const ownTemplate = (e: Omit<Seed, 'variants'>): MockEmail => ({
  ...e,
  variants: one(null),
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
  }),
];

/** [meaning, example, fallback], as the backend catalogue (domain/email_values.py) words them. `code` has no fallback. */
const VALUES: Record<string, [string, string, string | null]> = {
  recipientName: ['Full name of the person getting the email', 'Amara Okafor', 'there'],
  recipientFirstName: ['First name of the person getting the email', 'Amara', 'there'],
  mentorName: ['The mentor’s full name', 'Tunde Bakare', 'your mentor'],
  menteeName: ['The mentee’s full name', 'Amara Okafor', 'your mentee'],
  attendee: ['The other person in the session', 'Tunde Bakare', 'your mentor'],
  sessionDate: ['The booking’s date, in the reader’s zone', 'Fri 20 Nov 2026', 'the day'],
  sessionTime: ['The booking’s start time, in the reader’s zone', '3:00 PM', 'the time'],
  sessionTimezone: ['The reader’s time zone, as a code', 'WAT', 'your time zone'],
  // Two values, as in the backend catalogue: the offering, and what this booking is about.
  sessionName: ['The session’s name', 'CV review', 'your session'],
  sessionTopic: ['What this booking is about', 'My personal statement', 'your session'],
  sessionDetail: ['What the mentee wants to discuss', 'My personal statement', 'your notes'],
  location: ['Where the session happens', 'Google Meet', 'online'],
  hours: ['Hours left to answer the request', '12', 'a few'],
  intervalTime: ['How soon the session starts', 'Tomorrow', 'soon'],
  reminderMessage: ['The mentee’s note with the reminder', 'Just checking in', 'a reminder'],
  reasonTitle: ['The reason, in words', 'Schedule conflict', 'a change of plans'],
  reasonMessage: ['What the person wrote', 'Sorry, I’m traveling that week', 'no message'],
  cancelInitiator: ['Who canceled: the mentor or the mentee', 'Tunde', 'someone'],
  suggestedDate: ['The suggested time’s date', 'Sat 21 Nov 2026', 'the day'],
  suggestedTime: ['The suggested start time', '4:00 PM', 'the time'],
  holdUntilTime: ['When the suggested time is released', '5:30 PM', 'soon'],
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

// ---- One email and saving it (PRD 28 "How: API") -----------------------------

/** An admin's text for one line: what the edit history and the 409 check read. */
type Override = { text: string; version: number; defaultAtEdit: string; by: string; at: string };
const overrides = new Map<string, Override>();
const slot = (key: string, variant: string, line: WireLineKey) => `${key}:${variant}:${line}`;

/** The seeds: an edited subject, and one whose default moved since (`defaultChanged`). */
function seed() {
  overrides.clear();
  overrides.set(slot('session_booked', 'mentee', 'subject'), {
    text: 'Your session with {mentorName} is confirmed',
    version: 2,
    defaultAtEdit: 'Your session with {mentorName} is booked',
    by: 'Ada Okeke',
    at: daysAgo(3),
  });
  overrides.set(slot('credits_expiring', 'default', 'subject'), {
    text: 'Use your {creditCount} credits before they expire',
    version: 1,
    defaultAtEdit: 'Your credits run out this month',
    by: 'Chidi Eze',
    at: daysAgo(12),
  });
}
seed();
/** Tests: back to the seeds. */
export const resetMockEmails = seed;

const ADMIN_FULL_NAME = 'Ada Okeke';

const findEmail = (key: string) => MOCK_EMAILS.find((e) => e.key === key);

function lastEdited(key: string): MockEmail['last_edited'] {
  let newest: Override | null = null;
  for (const [k, o] of overrides)
    if (k.startsWith(`${key}:`) && (!newest || o.at > newest.at)) newest = o;
  return newest ? { admin_name: newest.by, at: newest.at } : (findEmail(key)?.last_edited ?? null);
}

function line(key: string, variant: Variant, l: WireLineKey): WireEmailLine {
  const def = variant.lines?.[l] ?? '';
  const o = overrides.get(slot(key, variant.id, l));
  return {
    default_text: def,
    text: o?.text ?? def,
    edited: !!o,
    version: o?.version ?? 0,
    default_changed: !!o && o.defaultAtEdit !== def,
    new_default: o && o.defaultAtEdit !== def ? def : null,
  };
}

function sampleFor(e: MockEmail, variant: Variant) {
  const toMentor =
    variant.id === 'mentor' || (variant.id === 'default' && !e.recipients.includes('mentee'));
  const person = toMentor
    ? { name: 'Tunde Bakare', first: 'Tunde', email: 'tunde.bakare@example.com' }
    : { name: 'Amara Okafor', first: 'Amara', email: 'amara.okafor@example.com' };
  const sample: Record<string, string> = {};
  for (const v of e.values) sample[v] = VALUES[v]?.[1] ?? v;
  if (e.values.includes('recipientName')) sample.recipientName = person.name;
  if (e.values.includes('recipientFirstName')) sample.recipientFirstName = person.first;
  if (variant.id === 'one_message' && e.values.includes('unreadCount')) sample.unreadCount = '1';
  return { sample, sample_recipient: { name: person.name, email: person.email } };
}

export function mockEmailDetail(key: string): WireEmailDetail | null {
  const e = findEmail(key);
  if (!e) return null;
  const summary = mockEmailList().find((x) => x.key === key)!;
  return {
    ...summary,
    last_edited: lastEdited(key),
    siblings: MOCK_EMAILS.filter((x) => x.group === e.group && x.key !== key).length,
    values: e.values.map((name) => {
      const [meaning, example, fallback] = VALUES[name] ?? [name, '', null];
      return { name, meaning, example, fallback };
    }),
    variants: e.variants.map((v) => ({
      id: v.id,
      label: v.label || e.name,
      ...sampleFor(e, v),
      lines: Object.fromEntries(
        LINE_KEYS.map((l) => [l, line(key, v, l)]),
      ) as WireEmailVariant['lines'],
    })),
  };
}

/**
 * A save as the editor sends it: all three lines with the version read, the
 * given ones changed. For tests and seeding.
 */
export function mockSaveBody(
  key: string,
  variantId: string,
  changed: Partial<Record<WireLineKey, string | { text: string; version: number }>>,
  keepEdit?: WireLineKey[],
): WireEmailSave {
  const read = mockEmailDetail(key)?.variants.find((v) => v.id === variantId)?.lines;
  const one = (l: WireLineKey) => {
    const c = changed[l];
    if (c && typeof c === 'object') return c;
    return { text: c ?? read?.[l].text ?? '', version: read?.[l].version ?? 0 };
  };
  return {
    lines: { subject: one('subject'), heading: one('heading'), button: one('button') },
    ...(keepEdit ? { keep_edit: keepEdit } : {}),
  };
}

type SaveResult = MockResult<WireEmailDetail, 200>;
const refuse = (status: ErrorStatus, problem: ProblemBody): SaveResult => ({
  ok: false,
  status,
  problem,
});

/** PUT …/variants/{variant}: every rule checked, then all lines written or none. */
export function mockSaveEmailVariant(
  key: string,
  variantId: string,
  body: WireEmailSave,
): SaveResult {
  const e = findEmail(key);
  const variant = e?.variants.find((v) => v.id === variantId);
  if (!e || !variant)
    return refuse(404, { type: '/problems/email-not-found', title: 'Email not found' });
  if (!e.live)
    return refuse(423, { type: '/problems/email-not-set-up', title: 'Email not set up' });
  const known = Object.keys(VALUES);
  const errors: WireEmailLineError[] = [];
  for (const l of LINE_KEYS) {
    const sent = body.lines[l];
    const err = checkLine(sent.text, l, known, e.values);
    if (err) errors.push({ line: l, ...err });
  }
  if (errors.length)
    return refuse(422, {
      type: '/problems/email-line-invalid',
      title: 'Email line invalid',
      errors,
    });
  for (const l of LINE_KEYS) {
    const sent = body.lines[l];
    const o = overrides.get(slot(key, variantId, l));
    if (sent.version !== (o?.version ?? 0))
      return refuse(409, {
        type: '/problems/email-line-conflict',
        title: 'Email line conflict',
        updated_by_name: o?.by ?? 'Chidi Eze',
        updated_at: o?.at ?? new Date().toISOString(),
      });
  }
  const at = new Date().toISOString();
  for (const l of LINE_KEYS) {
    const sent = body.lines[l];
    const def = variant.lines?.[l] ?? '';
    const k = slot(key, variantId, l);
    const o = overrides.get(k);
    const keep = body.keep_edit?.includes(l) ?? false;
    // Saved as exactly the default: no override, the badge goes back to Default.
    if (sent.text === def) {
      overrides.delete(k);
      continue;
    }
    if (o && o.text === sent.text && !keep) continue;
    overrides.set(k, {
      text: sent.text,
      version: (o?.version ?? 0) + 1,
      defaultAtEdit: def,
      by: ADMIN_FULL_NAME,
      at,
    });
  }
  return { ok: true, status: 200, body: mockEmailDetail(key)! };
}
