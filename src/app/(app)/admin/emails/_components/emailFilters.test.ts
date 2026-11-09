import type { EmailSummary } from '@/lib/api/data/adminEmails';
import { groupEmails } from '@/lib/api/data/adminEmails';
import { filterEmails, filterValues, filtersActive, NO_EMAIL_FILTERS } from './emailFilters';

const email = (over: Partial<EmailSummary>): EmailSummary => ({
  key: 'k',
  name: 'Name',
  trigger: 'Trigger',
  group: 'g',
  groupName: 'G',
  templateName: 'g',
  recipients: ['mentee'],
  live: true,
  lastEdited: null,
  ...over,
});

const LIST = [
  email({
    key: 'booked',
    name: 'Session booked',
    trigger: 'A booking is confirmed',
    group: 'session_confirmed',
    recipients: ['mentor', 'mentee'],
  }),
  email({
    key: 'granted',
    name: 'Credits granted',
    trigger: 'An admin adds credits',
    group: 'credits',
  }),
  email({
    key: 'app',
    name: 'Application received',
    trigger: 'A mentor applies',
    group: 'app',
    recipients: ['mentor', 'admins'],
    live: false,
  }),
];
const keysOf = (l: EmailSummary[]) => l.map((e) => e.key);

describe('filterEmails', () => {
  it('search matches the name or the trigger, ignoring case', () => {
    expect(keysOf(filterEmails(LIST, 'CREDITS', NO_EMAIL_FILTERS))).toEqual(['granted']);
    expect(keysOf(filterEmails(LIST, 'confirmed', NO_EMAIL_FILTERS))).toEqual(['booked']);
  });

  it('Goes to: an email to both sides matches Mentors and Mentees; Admins needs an admins variant', () => {
    expect(keysOf(filterEmails(LIST, '', { ...NO_EMAIL_FILTERS, to: 'mentee' }))).toEqual([
      'booked',
      'granted',
    ]);
    expect(keysOf(filterEmails(LIST, '', { ...NO_EMAIL_FILTERS, to: 'mentor' }))).toEqual([
      'booked',
      'app',
    ]);
    expect(keysOf(filterEmails(LIST, '', { ...NO_EMAIL_FILTERS, to: 'admins' }))).toEqual(['app']);
  });

  it('group and template status', () => {
    expect(keysOf(filterEmails(LIST, '', { ...NO_EMAIL_FILTERS, group: 'credits' }))).toEqual([
      'granted',
    ]);
    expect(keysOf(filterEmails(LIST, '', { ...NO_EMAIL_FILTERS, status: 'notSetUp' }))).toEqual([
      'app',
    ]);
    expect(keysOf(filterEmails(LIST, '', { ...NO_EMAIL_FILTERS, status: 'live' }))).toEqual([
      'booked',
      'granted',
    ]);
  });

  it('filtersActive counts the search too, not blank space', () => {
    expect(filtersActive('  ', NO_EMAIL_FILTERS)).toBe(false);
    expect(filtersActive('x', NO_EMAIL_FILTERS)).toBe(true);
    expect(filtersActive('', { ...NO_EMAIL_FILTERS, to: 'admins' })).toBe(true);
  });
});

it('groupEmails keeps registry order and puts each group together', () => {
  const g = groupEmails([
    email({ key: 'a', group: 'x', groupName: 'X' }),
    email({ key: 'b', group: 'x', groupName: 'X' }),
    email({ key: 'c', group: 'y', groupName: 'Y' }),
  ]);
  expect(g.map((x) => [x.name, x.emails.map((e) => e.key)])).toEqual([
    ['X', ['a', 'b']],
    ['Y', ['c']],
  ]);
});

it('filterValues matches the name or meaning', () => {
  const vals = [
    {
      name: 'mentorName',
      meaning: 'The mentor’s full name',
      example: '',
      fallback: null,
      usedIn: [],
    },
    { name: 'code', meaning: 'The 6-digit sign-in code', example: '', fallback: null, usedIn: [] },
  ];
  expect(filterValues(vals, 'sign-in').map((v) => v.name)).toEqual(['code']);
  expect(filterValues(vals, 'MENTOR').map((v) => v.name)).toEqual(['mentorName']);
  expect(filterValues(vals, '')).toHaveLength(2);
});
