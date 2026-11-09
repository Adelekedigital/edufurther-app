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
