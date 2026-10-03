import type { Booking, BookingParty, BookingStatus } from '@/types/booking';
import {
  attendanceLine,
  bookingHeading,
  formatRespondIn,
  fullDate,
  isLapsed,
  isRespondUrgent,
  joinOpensInMinutes,
  joinState,
  nextSessionWhen,
  otherTimeLine,
  respondDeadline,
  statusTag,
  tabOf,
  timeRange,
} from './bookings';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

const party = (over: Partial<BookingParty> = {}): BookingParty => ({
  id: 'p1',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  avatarUrl: null,
  avatarFocus: null,
  deleted: false,
  timeZone: 'Africa/Lagos',
  cover: 'sand',
  joinedAt: null,
  ...over,
});

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentor',
  other: party(),
  startsAt: at(24),
  endsAt: at(25),
  durationMin: 60,
  title: 'School shortlist',
  note: null,
  createdAt: at(-240),
  respondBy: null,
  joinOpensAt: null,
  joinClosesAt: null,
  menteeAttendanceRate: null,
  ...over,
});

describe('respondDeadline / isLapsed', () => {
  it('uses respond_by when it is there', () => {
    const b = booking({ status: 'pending', respondBy: at(6), startsAt: at(48) });
    expect(respondDeadline(b)).toBe(at(6));
    expect(isLapsed(b, NOW)).toBe(false);
  });

  it('falls back to the start for a migrated request with no deadline', () => {
    const b = booking({ status: 'pending', respondBy: null, startsAt: at(-1) });
    expect(respondDeadline(b)).toBe(at(-1));
    expect(isLapsed(b, NOW)).toBe(true);
  });

  it('is lapsed the moment the deadline passes, before the sweep renames it', () => {
    expect(isLapsed(booking({ status: 'pending', respondBy: at(-0.001) }), NOW)).toBe(true);
    expect(isLapsed(booking({ status: 'pending', respondBy: at(1) }), NOW)).toBe(false);
  });

  it('only a pending request can lapse', () => {
    expect(isLapsed(booking({ status: 'confirmed', startsAt: at(-10) }), NOW)).toBe(false);
  });
});

describe('tabOf', () => {
  it.each([
    ['pending', 'pending'],
    ['confirmed', 'upcoming'],
    ['completed', 'history'],
    ['cancelled', 'history'],
    ['declined', 'history'],
    ['expired', 'history'],
    ['noShow', 'history'],
    ['withdrawn', 'history'],
  ] as [BookingStatus, string][])('%s → %s', (status, tab) => {
    expect(tabOf(booking({ status }))).toBe(tab);
  });
});

describe('formatRespondIn', () => {
  it('minutes under the hour, never zero', () => {
    expect(formatRespondIn(at(0.5), NOW)).toBe('30 min');
    expect(formatRespondIn(new Date(NOW.getTime() + 10_000).toISOString(), NOW)).toBe('1 min');
  });
  it('hours up to two days, then days', () => {
    expect(formatRespondIn(at(5), NOW)).toBe('5h');
    expect(formatRespondIn(at(47), NOW)).toBe('47h');
    expect(formatRespondIn(at(72), NOW)).toBe('3 days');
  });
  it('is urgent under a day', () => {
    expect(isRespondUrgent(at(23), NOW)).toBe(true);
    expect(isRespondUrgent(at(25), NOW)).toBe(false);
  });
});

describe('joinState', () => {
  const window = (openH: number, closeH: number) =>
    booking({ joinOpensAt: at(openH), joinClosesAt: at(closeH) });

  it('is none without a window, or on anything unconfirmed', () => {
    expect(joinState(booking(), NOW)).toBe('none');
    expect(joinState({ ...window(-1, 1), status: 'completed' }, NOW)).toBe('none');
  });
  it('before, open and closed around the window', () => {
    expect(joinState(window(1, 2), NOW)).toBe('before');
    expect(joinState(window(-1, 1), NOW)).toBe('open');
    expect(joinState(window(-2, -1), NOW)).toBe('closed');
  });
  it('reads the opening offset from the session rather than assuming it', () => {
    const b = booking({ startsAt: at(1), joinOpensAt: at(1 - 5 / 60), joinClosesAt: at(1.25) });
    expect(joinOpensInMinutes(b)).toBe(5);
    expect(joinOpensInMinutes(booking())).toBeNull();
  });
});

describe('nextSessionWhen', () => {
  it('counts up once it has started', () => {
    expect(nextSessionWhen(booking({ startsAt: at(-0.1) }), NOW)).toMatchObject({
      label: 'Started 6 min ago',
      icon: 'radio_button_checked',
      live: true,
    });
  });
  it('minutes, hours, tomorrow, then days', () => {
    expect(nextSessionWhen(booking({ startsAt: at(0.5) }), NOW).label).toBe('Starts in 30 min');
    expect(nextSessionWhen(booking({ startsAt: at(9) }), NOW).label).toBe('Starts in 9 h');
    expect(nextSessionWhen(booking({ startsAt: at(30) }), NOW).label).toBe('Tomorrow');
    expect(nextSessionWhen(booking({ startsAt: at(24 * 8) }), NOW).label).toBe('In 8 days');
  });
});

describe('statusTag', () => {
  it('names all six past outcomes, in their tone', () => {
    expect(statusTag('completed')).toEqual({ label: 'Completed', tone: 'success' });
    expect(statusTag('cancelled')).toEqual({ label: 'Canceled', tone: 'warning' });
    expect(statusTag('noShow')).toEqual({ label: 'Missed', tone: 'danger' });
    expect(statusTag('declined')).toEqual({ label: 'Declined', tone: 'danger' });
    expect(statusTag('expired')).toEqual({ label: 'Unconfirmed', tone: 'warning' });
    expect(statusTag('withdrawn')).toEqual({ label: 'Withdrawn', tone: 'warning' });
  });
  it('draws nothing for a session that is not over', () => {
    expect(statusTag('confirmed')).toBeNull();
    expect(statusTag('pending')).toBeNull();
  });
});

describe('copy', () => {
  it('heads with the topic, and drops to "Session with" without one', () => {
    expect(bookingHeading(booking())).toBe('School shortlist session with Amara Okafor');
    expect(bookingHeading(booking({ title: null }))).toBe('Session with Amara Okafor');
  });

  it('shows an attendance rate only to the mentor, and only with data', () => {
    expect(attendanceLine(booking({ menteeAttendanceRate: 92 }))).toBe('Attendance rate: 92%');
    expect(attendanceLine(booking({ menteeAttendanceRate: null }))).toBe('Mentee');
    expect(attendanceLine(booking({ side: 'mentee', menteeAttendanceRate: 92 }))).toBe('Mentor');
  });

  it('reads times in the viewer’s zone, not the stored one', () => {
    const b = booking({ startsAt: '2026-10-04T16:00:00Z', endsAt: '2026-10-04T17:00:00Z' });
    expect(timeRange(b, 'Africa/Lagos')).toBe('5:00 pm to 6:00 pm');
    expect(timeRange(b, 'America/New_York')).toBe('12:00 pm to 1:00 pm');
    expect(fullDate(b.startsAt, 'Africa/Lagos')).toBe('Oct 4, 2026');
  });
});

describe('otherTimeLine', () => {
  const b = booking({
    startsAt: '2026-10-04T16:00:00Z',
    endsAt: '2026-10-04T17:00:00Z',
    other: party({ timeZone: 'Africa/Lagos' }),
  });

  it('says what time it is for them, and where they are', () => {
    expect(otherTimeLine(b, 'America/New_York')?.text).toBe('5:00 pm to 6:00 pm for Amara in Lagos');
  });

  it('is silent when their zone is the viewer’s — it would only repeat the row', () => {
    expect(otherTimeLine(b, 'Africa/Lagos')).toBeNull();
  });

  it('is silent when their zone is unknown', () => {
    expect(otherTimeLine({ ...b, other: party({ timeZone: null }) }, 'America/New_York')).toBeNull();
  });

  it('flags an hour nobody wants, and says which end of the day it is', () => {
    const late = booking({
      startsAt: '2026-10-04T22:00:00Z',
      endsAt: '2026-10-04T23:00:00Z',
      other: party({ timeZone: 'Africa/Lagos' }),
    });
    expect(otherTimeLine(late, 'America/New_York')).toEqual({
      text: '11:00 pm to 12:00 am for Amara in Lagos · late for Amara',
      odd: true,
    });
    const early = booking({
      startsAt: '2026-10-04T04:00:00Z',
      endsAt: '2026-10-04T05:00:00Z',
      other: party({ timeZone: 'Africa/Lagos' }),
    });
    expect(early.startsAt && otherTimeLine(early, 'America/New_York')?.text).toContain(
      'early for Amara',
    );
  });

  it('puts their date in front when the session lands on another day for them', () => {
    const b2 = booking({
      startsAt: '2026-10-04T23:30:00Z',
      endsAt: '2026-10-05T00:30:00Z',
      other: party({ timeZone: 'Pacific/Auckland' }),
    });
    expect(otherTimeLine(b2, 'America/New_York')?.text).toMatch(/^Mon, Oct 5 · /);
  });

  it('spells a multi-word city properly', () => {
    const b2 = booking({ other: party({ timeZone: 'America/Port_of_Spain' }) });
    expect(otherTimeLine(b2, 'Africa/Lagos')?.text).toContain('in Port of Spain');
  });
});
