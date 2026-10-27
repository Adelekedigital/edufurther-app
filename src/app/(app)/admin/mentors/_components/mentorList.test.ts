import type { AdminMentorRow } from '@/lib/api/data/adminMentors';
import {
  daysAgo,
  defaultSort,
  filtersActive,
  NO_FILTERS,
  tierTone,
  visibleMentors,
  waitTone,
} from './mentorList';

const NOW = new Date('2026-10-26T12:00:00Z');
const ago = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const row = (p: Partial<AdminMentorRow>): AdminMentorRow => ({
  id: p.name ?? 'x',
  name: 'X',
  firstName: 'X',
  initials: 'X',
  cover: 'sky',
  photoUrl: null,
  handle: null,
  email: 'x@example.com',
  submittedAt: null,
  approvedAt: null,
  decidedAt: null,
  pausedAt: null,
  pausedBy: null,
  pausedReason: null,
  declineReason: null,
  waitingDays: null,
  school: null,
  completed: 0,
  upcoming: 0,
  showUpRate: null,
  showUpTier: null,
  ...p,
});

const apps = [
  row({ name: 'Amaka Okafor', email: 'amaka@example.com', submittedAt: ago(1), waitingDays: 1 }),
  row({ name: 'Jimoh Marko', email: 'jimoh@example.com', submittedAt: ago(7), waitingDays: 7 }),
  row({
    name: 'Kwame Mensah',
    email: 'kwame.mensah@example.com',
    submittedAt: ago(3),
    waitingDays: 3,
  }),
];
const names = (r: AdminMentorRow[]) => r.map((m) => m.name.split(' ')[0]);
const run = (
  q = '',
  f = NO_FILTERS,
  rows = apps,
  tab: 'applications' | 'approved' = 'applications',
) => names(visibleMentors(rows, tab, q, f, 'UTC', NOW));

describe('visibleMentors', () => {
  it('Applications default to the longest wait first', () => {
    expect(run()).toEqual(['Jimoh', 'Kwame', 'Amaka']);
  });

  it('search matches name or email, ignoring case', () => {
    expect(run('JIMOH')).toEqual(['Jimoh']);
    expect(run('MENSAH@')).toEqual(['Kwame']);
  });

  it('waiting time and date filters', () => {
    expect(run('', { ...NO_FILTERS, wait: 'u3' })).toEqual(['Amaka']);
    expect(run('', { ...NO_FILTERS, wait: '3to7' })).toEqual(['Jimoh', 'Kwame']);
    expect(run('', { ...NO_FILTERS, wait: 'over7' })).toEqual([]);
    expect(run('', { ...NO_FILTERS, date: '7' })).toEqual(['Jimoh', 'Kwame', 'Amaka']);
    expect(run('', { ...NO_FILTERS, date: 'older' })).toEqual([]);
  });

  it('sorts by name and by date', () => {
    expect(run('', { ...NO_FILTERS, sort: 'za' })).toEqual(['Kwame', 'Jimoh', 'Amaka']);
    expect(run('', { ...NO_FILTERS, sort: 'newest' })).toEqual(['Amaka', 'Kwame', 'Jimoh']);
  });

  it('show-up filter reads the backend tier', () => {
    const live = [
      row({ name: 'A', approvedAt: ago(5), showUpTier: 'onTrack' }),
      row({ name: 'B', approvedAt: ago(9), showUpTier: 'atRisk' }),
      row({ name: 'C', approvedAt: ago(2), showUpTier: null }),
    ];
    expect(run('', NO_FILTERS, live, 'approved')).toEqual(['C', 'A', 'B']);
    expect(run('', { ...NO_FILTERS, showUp: 'atRisk' }, live, 'approved')).toEqual(['B']);
    expect(run('', { ...NO_FILTERS, showUp: 'none' }, live, 'approved')).toEqual(['C']);
  });
});

describe('filtersActive', () => {
  it('the tab default sort is not a change', () => {
    expect(filtersActive('applications', { ...NO_FILTERS, sort: 'longest' })).toBe(false);
    expect(filtersActive('approved', { ...NO_FILTERS, sort: 'longest' })).toBe(true);
    expect(filtersActive('approved', { ...NO_FILTERS, date: '30' })).toBe(true);
    expect(defaultSort('notApproved')).toBe('newest');
  });
});

describe('helpers', () => {
  it('daysAgo counts calendar days in the zone', () => {
    expect(daysAgo('2026-10-25T23:30:00Z', 'UTC', NOW)).toBe(1);
    // 23:30 UTC is already the 26th in Lagos (UTC+1): today.
    expect(daysAgo('2026-10-25T23:30:00Z', 'Africa/Lagos', NOW)).toBe(0);
  });

  it('wait and tier tones', () => {
    expect([2, 3, 5].map(waitTone)).toEqual([null, 'warning', 'danger']);
    expect(tierTone(null)).toBe('pending');
    expect(tierTone('needsAttention')).toBe('warning');
  });
});
