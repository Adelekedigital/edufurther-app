import type { EmailRecipient } from '@/lib/api/data/adminEmails';

/**
 * Admin Emails (PRD 28; Admin Emails.dc.html): the list and Values tabs.
 * Reviewed against the ux-writer rules.
 */

export const EMAIL_TABS = { label: 'Email pages', list: 'Emails', values: 'Values' } as const;

export const EMAIL_FILTERS = {
  group: 'Search and filter emails',
  search: { label: 'Search', placeholder: 'Email name or what triggers it' },
  groups: { label: 'Group', all: 'All groups' },
  to: {
    label: 'Goes to',
    options: { all: 'Everyone', mentor: 'Mentors', mentee: 'Mentees', admins: 'Admins' },
  },
  status: {
    label: 'Template',
    options: { all: 'Any status', live: 'Live', notSetUp: 'Not set up' },
  },
  count: (shown: number, total: number) => `Showing ${shown} of ${total}`,
  clear: 'Clear filters',
} as const;

export const EMAIL_STATUS = { live: 'Live', notSetUp: 'Not set up' } as const;

/** "Mentor", "Mentor and mentee", "Mentor and admins". */
export function goesTo(recipients: readonly EmailRecipient[]): string {
  const words = { mentor: 'mentor', mentee: 'mentee', admins: 'admins' } as const;
  const list = (['mentor', 'mentee', 'admins'] as const).filter((r) => recipients.includes(r));
  const text = list.map((r) => words[r]).join(' and ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const EMAIL_LIST = {
  columns: { email: 'Email', to: 'Goes to', template: 'Template', edited: 'Last edited' },
  groupMeta: (n: number, template: string) =>
    `${n} ${n === 1 ? 'email' : 'emails'} · Template “${template}”`,
  defaultWording: 'Default wording',
  row: (name: string, status: string) => `${name}, ${status}. Edit wording`,
  loading: 'Loading emails',
  error: {
    title: 'We couldn’t load emails',
    // The list holds no edits, so the design's 'Nothing you changed was lost.' is dropped (ux-writer).
    body: 'Check your connection and try again.',
    retry: 'Try again',
  },
  noMatch: { title: 'No emails match', body: 'Try a different search or clear the filters.' },
  none: { title: 'No emails yet', body: 'Emails show up here once engineering registers them.' },
} as const;

export const EMAIL_VALUES = {
  search: { label: 'Search values', placeholder: 'Name or meaning' },
  table: 'Values',
  // Fallbacks fill only the subject, heading and button label (PRD 28, designer item 93).
  note: 'Read only. Values come from the booking, account or message the email is about. If a value is empty in a subject, heading or button label, its fallback is used.',
  columns: {
    value: 'Value',
    meaning: 'What it means',
    example: 'Example',
    fallback: 'If empty',
    usedIn: 'Used in',
  },
  noFallback: 'None: the email isn’t sent',
  /** More than 4: the first 3 and "and N more". */
  usedIn: (names: readonly string[]) =>
    names.length > 4
      ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`
      : names.join(', '),
  noMatch: (q: string) => `No values match “${q}”.`,
  none: 'No values yet. They show up here once engineering adds them.',
  error: {
    title: 'We couldn’t load values',
    body: 'Check your connection and try again.',
    retry: 'Try again',
  },
} as const;

const others = (n: number) =>
  n === 0 ? 'no other emails' : n === 1 ? '1 other email' : `${n} other emails`;

/** Admin Emails.dc.html "2. Edit an email" (PRD 28 "Edit an email"). */
export const EMAIL_EDITOR = {
  pageTitle: 'Edit email',
  back: 'All emails',
  meta: (trigger: string, to: string, template: string, siblings: number) =>
    `${trigger} · Goes to ${to.toLowerCase()} · Template “${template}”, shared with ${others(siblings)}`,
  notSetUp:
    'This email has no template yet, so it isn’t sent. An engineer needs to connect one before you can change the wording.',
  /** The variant tabs' label: recipients, or the unread email's cases. */
  variants: { recipient: 'Who gets it', case: 'Which case' },
  conflict: (fullName: string, ago: string, firstName: string) =>
    `${fullName} saved this email ${ago}, so your changes weren’t saved. They’re still here. Reload to see ${firstName}’s version, then make your changes again.`,
  conflictUnknown: (ago: string) =>
    `Someone saved this email ${ago}, so your changes weren’t saved. They’re still here. Reload to see their version, then make your changes again.`,
  reload: 'Reload this email',
  /** Read with a variant's tab while it has unsaved work. */
  unsavedTab: 'unsaved changes',
  lines: { subject: 'Subject', heading: 'Heading', button: 'Button label' },
  badge: { default: 'Default', edited: 'Edited' },
  reset: 'Reset to default',
  menuTitle: 'Values this email can use',
  errors: {
    empty: (label: string) =>
      `Add a ${label.toLowerCase()}. To go back to the default, use Reset to default.`,
    // Designer item 90: the button is "Insert a value", so the errors say so.
    unknown: (value: string, suggestion?: string) =>
      suggestion
        ? `{${value}} isn’t a value we know. Did you mean {${suggestion}}?`
        : `{${value}} isn’t a value we know. Pick one from Insert a value.`,
    notSent: (value: string, email: string) =>
      `{${value}} isn’t sent with ${email}, so it would show up empty. Pick one from Insert a value.`,
    tooLong: (max: number) => `Keep it to ${max} characters or fewer.`,
  },
  warnings: {
    subject: {
      short: 'Under 20 characters can be too vague to open.',
      long: 'Over 60 characters gets cut off in most phone inboxes.',
    },
    heading: { short: '', long: 'Over 60 characters wraps to 3 lines on phones.' },
    button: { short: '', long: 'Over 25 characters wraps on phones. Aim for 2 to 4 words.' },
  },
  aim: { subject: 'aim for 20 to 60', heading: 'aim for up to 60', button: 'aim for up to 25' },
  help: (sent: number, aim: string) =>
    `${sent} characters as sent · ${aim} · Type / or use { } to add a value`,
  defaultChanged: {
    lead: 'The default changed since this line was edited.',
    body: (next: string) => `New default: “${next}”. Your edit is still the one being sent.`,
    useNew: 'Use the new default',
    keep: 'Keep my edit',
  },
  preview: {
    title: 'Preview',
    sample: (name: string, session?: string) =>
      `Sample data: ${name}${session ? `, ${session}` : ''}`,
    from: (email: string) => `From EduFurther · To ${email}`,
    body: 'Email body from the template',
    note: 'The grey lines stand for the template’s body, which you can’t edit here yet.',
  },
  save: {
    region: 'Save changes',
    unsaved: 'You have unsaved changes.',
    fix: (n: number) => (n === 1 ? 'Fix 1 line before saving.' : `Fix ${n} lines before saving.`),
    reloadFirst: 'Reload this email before saving.',
    discard: 'Discard changes',
    save: 'Save changes',
    saving: 'Saving…',
  },
  confirm: {
    title: (email: string) => `Save changes to ${email}?`,
    body: (email: string, variant?: string) =>
      `The next ${email} email${variant ? ` (${variant.toLowerCase()})` : ''} uses this wording. Emails already sent don’t change.`,
    keep: 'Keep editing',
    save: 'Save changes',
  },
  saved: (email: string) => `${email} saved. The next email uses it.`,
  loading: 'Loading email',
  notFound: {
    title: 'We couldn’t find that email',
    body: 'It isn’t in the list of emails. Go back and pick another.',
  },
  error: {
    title: 'We couldn’t load this email',
    body: 'Check your connection and try again.',
    retry: 'Try again',
  },
  leaveLabel: 'this email',
} as const;
