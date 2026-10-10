import type { Booking, BookingParty, BookingStatus } from '@/types/booking';
import {
  attendanceLine,
  canAccept,
  overlapping,
  partyLine,
  refundWindowFor,
  canCancel,
  canDecline,
  canWithdraw,
  refundOnCancel,
  showedUp,
  bookingHeading,
  formatRespondIn,
  fullDate,
  isLapsed,
  isRespondUrgent,
  joinOpensInMinutes,
  joinState,
  nextSessionWhen,
  otherTimeLine,
  waitingPill,
  safeMeetingUrl,
  respondDeadline,
  statusTag,
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
  degree: null,
  institution: null,
  joinedAt: null,
  inRoomAt: null,
  attendance: 'pending',
  ...over,
});

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  status: 'confirmed',
  side: 'mentor',
  other: party(),
  myAttendance: 'pending' as const,
  myJoinedAt: null,
  startsAt: at(24),
  endsAt: at(25),
  durationMin: 60,
  title: 'School shortlist',
  note: null,
  answersPreview: null,
  suggestion: null,
  sessionTypeId: 'st1',
  createdAt: at(-240),
  respondBy: null,
  joinOpensAt: null,
  joinClosesAt: null,
  doorClosesAt: null,
  refundUntil: null,
  menteeAttendanceRate: null,
  menteeAttendanceSessions: 0,
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
  it('stays open until the room closes for someone who has joined, so they can get back', () => {
    const b = booking({
      joinOpensAt: at(-1),
      joinClosesAt: at(-0.5),
      doorClosesAt: at(0.5),
      myJoinedAt: at(-0.9),
    });
    expect(joinState(b, NOW)).toBe('open');
    expect(joinState({ ...b, doorClosesAt: at(-0.1) }, NOW)).toBe('closed');
  });
  it('closes with the arrival window for someone who never joined', () => {
    const b = booking({ joinOpensAt: at(-1), joinClosesAt: at(-0.5), doorClosesAt: at(0.5) });
    expect(joinState(b, NOW)).toBe('closed');
  });
  it('keeps a session settled mid-call open until its room closes, for someone who joined', () => {
    const b = booking({
      joinOpensAt: at(-1),
      joinClosesAt: at(-0.5),
      doorClosesAt: at(0.5),
      myJoinedAt: at(-0.9),
    });
    expect(joinState({ ...b, status: 'completed' }, NOW)).toBe('open');
    expect(joinState({ ...b, status: 'noShow' }, NOW)).toBe('open');
    expect(joinState({ ...b, status: 'cancelled' }, NOW)).toBe('none');
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
    expect(statusTag('expired')).toEqual({ label: 'Expired', tone: 'warning' });
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
    expect(otherTimeLine(b, 'America/New_York')?.text).toBe(
      '5:00 pm to 6:00 pm for Amara in Lagos',
    );
  });

  it('is silent when their zone is the viewer’s — it would only repeat the row', () => {
    expect(otherTimeLine(b, 'Africa/Lagos')).toBeNull();
  });

  it('is silent when their zone is unknown', () => {
    expect(
      otherTimeLine({ ...b, other: party({ timeZone: null }) }, 'America/New_York'),
    ).toBeNull();
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

describe('safeMeetingUrl', () => {
  it('passes an https link through', () => {
    expect(safeMeetingUrl('https://meet.example.com/abc')).toBe('https://meet.example.com/abc');
    expect(safeMeetingUrl('  https://meet.example.com/abc  ')).toBe('https://meet.example.com/abc');
  });

  it('refuses anything that is not https — a custom venue is someone else’s text', () => {
    expect(safeMeetingUrl('javascript:alert(1)')).toBeNull();
    expect(safeMeetingUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeMeetingUrl('http://meet.example.com/abc')).toBeNull();
    expect(safeMeetingUrl('ms-msdt:/id')).toBeNull();
    expect(safeMeetingUrl('/room/abc')).toBeNull();
    expect(safeMeetingUrl('not a url')).toBeNull();
    expect(safeMeetingUrl(null)).toBeNull();
  });

  it('refuses embedded credentials', () => {
    expect(safeMeetingUrl('https://user:pass@meet.example.com/abc')).toBeNull();
  });
});

describe('nextSessionWhen counts calendar days', () => {
  // Saturday 1 pm UTC. Monday noon is two sleeps away, not "Tomorrow".
  const sat = new Date('2026-10-03T13:00:00Z');
  it('a Monday session on a Saturday afternoon is "In 2 days"', () => {
    const b = booking({ startsAt: '2026-10-05T12:00:00Z' });
    expect(nextSessionWhen(b, sat, 'UTC').label).toBe('In 2 days');
  });
  it('tomorrow is tomorrow, however few hours away', () => {
    expect(nextSessionWhen(booking({ startsAt: '2026-10-04T01:00:00Z' }), sat, 'UTC').label).toBe(
      'Tomorrow',
    );
  });
  it('the same day stays in hours', () => {
    expect(nextSessionWhen(booking({ startsAt: '2026-10-03T22:00:00Z' }), sat, 'UTC').label).toBe(
      'Starts in 9 h',
    );
  });
  it('counts the days in the viewer’s zone, not UTC', () => {
    // 11pm Saturday UTC is already Sunday in Lagos.
    const b = booking({ startsAt: '2026-10-03T23:00:00Z' });
    expect(nextSessionWhen(b, sat, 'UTC').label).toBe('Starts in 10 h');
    expect(nextSessionWhen(b, sat, 'Africa/Lagos').label).toBe('Tomorrow');
  });
});

describe('otherTimeLine survives a bad zone', () => {
  it('says nothing rather than taking the row down', () => {
    const b = booking({ other: party({ timeZone: 'Not/AZone' }) });
    expect(otherTimeLine(b, 'Africa/Lagos')).toBeNull();
  });
});

describe('waitingPill', () => {
  const pending = (over: Partial<Booking> = {}) =>
    booking({ status: 'pending', respondBy: at(40), ...over });

  it('tells the mentor what to do and by when', () => {
    expect(waitingPill(pending({ side: 'mentor' }), NOW)).toEqual({
      icon: 'timer',
      text: 'Respond within 40h',
      urgent: false,
    });
  });

  it('tells the mentee who it waits on, while there is time', () => {
    expect(waitingPill(pending({ side: 'mentee' }), NOW)).toEqual({
      icon: 'hourglass_top',
      text: 'Waiting for Amara to confirm',
      urgent: false,
    });
  });

  it('once it is close, the mentee is told how close — "waiting" stops helping', () => {
    expect(waitingPill(pending({ side: 'mentee', respondBy: at(18) }), NOW)).toEqual({
      icon: 'timer',
      text: 'Amara has 18h left to confirm',
      urgent: true,
    });
  });

  it('the mentor’s own pill goes warm on the same deadline', () => {
    expect(waitingPill(pending({ side: 'mentor', respondBy: at(18) }), NOW)).toMatchObject({
      text: 'Respond within 18h',
      urgent: true,
    });
  });

  it('nothing for a lapsed request: the countdown would be a lie', () => {
    expect(waitingPill(pending({ respondBy: at(-1) }), NOW)).toBeNull();
  });

  it('nothing for anything that is not pending', () => {
    expect(waitingPill(booking({ status: 'confirmed' }), NOW)).toBeNull();
    expect(waitingPill(booking({ status: 'completed' }), NOW)).toBeNull();
  });
});

describe('who may do what (PR 3a)', () => {
  const pending = (over = {}) =>
    booking({ status: 'pending', respondBy: at(5), startsAt: at(48), endsAt: at(49), ...over });
  const confirmed = (hours: number, over = {}) =>
    booking({ status: 'confirmed', startsAt: at(hours), endsAt: at(hours + 1), ...over });

  it('only the mentor answers a request, and only while it is still waiting', () => {
    expect(canAccept(pending({ side: 'mentor' }), NOW)).toBe(true);
    expect(canDecline(pending({ side: 'mentor' }), NOW)).toBe(true);
    expect(canAccept(pending({ side: 'mentee' }), NOW)).toBe(false);
    // Lapsed: the deadline passed, so it is the backend's to expire, not ours.
    expect(canAccept(pending({ side: 'mentor', respondBy: at(-1) }), NOW)).toBe(false);
    expect(canAccept(confirmed(48, { side: 'mentor' }), NOW)).toBe(false);
  });

  it('only the mentee withdraws, and only before it is answered', () => {
    expect(canWithdraw(pending({ side: 'mentee' }), NOW)).toBe(true);
    expect(canWithdraw(pending({ side: 'mentor' }), NOW)).toBe(false);
    expect(canWithdraw(confirmed(48, { side: 'mentee' }), NOW)).toBe(false);
  });

  it('nobody cancels inside ten minutes of the start — the word reaches no one in time', () => {
    for (const side of ['mentor', 'mentee'] as const) {
      expect(canCancel(confirmed(1, { side }), NOW)).toBe(true);
      expect(canCancel(confirmed(0.25, { side }), NOW)).toBe(true); // 15 min
      expect(canCancel(confirmed(0.1, { side }), NOW)).toBe(false); // 6 min
      expect(canCancel(confirmed(-1, { side }), NOW)).toBe(false);
    }
  });

  it('a mentor’s cancellation always refunds; a mentee’s needs twelve hours', () => {
    expect(refundOnCancel(confirmed(1, { side: 'mentor' }), NOW)).toBe(true);
    expect(refundOnCancel(confirmed(0.3, { side: 'mentor' }), NOW)).toBe(true);
    expect(refundOnCancel(confirmed(13, { side: 'mentee' }), NOW)).toBe(true);
    expect(refundOnCancel(confirmed(12, { side: 'mentee' }), NOW)).toBe(true);
    expect(refundOnCancel(confirmed(11.9, { side: 'mentee' }), NOW)).toBe(false);
  });

  it('only a confirmed session can be cancelled at all', () => {
    expect(canCancel(pending({ side: 'mentee' }), NOW)).toBe(false);
    expect(canCancel(booking({ status: 'completed' }), NOW)).toBe(false);
  });
});

describe('did anybody turn up', () => {
  const withAttendance = (mine: string, theirs: string) =>
    booking({
      status: 'noShow',
      myAttendance: mine as 'pending',
      other: party({ attendance: theirs as 'pending' }),
    });

  it('one of them there is enough', () => {
    expect(showedUp(withAttendance('attended', 'noShow'))).toBe(true);
    expect(showedUp(withAttendance('noShow', 'attended'))).toBe(true);
    // Leaving early still means they came.
    expect(showedUp(withAttendance('leftEarly', 'noShow'))).toBe(true);
  });

  it('both absent is nobody', () => {
    expect(showedUp(withAttendance('noShow', 'noShow'))).toBe(false);
  });

  it('pending is unknown, never absence', () => {
    // Two migrated bookings have no participant record at all. Reading that as
    // "nobody came" would accuse people of missing a session they attended.
    expect(showedUp(withAttendance('pending', 'pending'))).toBe(null);
    expect(showedUp(withAttendance('pending', 'noShow'))).toBe(null);
  });
});

describe('a request that would run into a confirmed session', () => {
  const req = booking({ id: 'r', status: 'pending', startsAt: at(10), endsAt: at(11) });
  const conf = (id: string, from: number, to: number) =>
    booking({ id, status: 'confirmed', startsAt: at(from), endsAt: at(to) });

  it('finds one that straddles the start', () => {
    expect(overlapping(req, [conf('c', 9.5, 10.5)])?.id).toBe('c');
  });

  it('finds one wholly inside it, and one that swallows it', () => {
    expect(overlapping(req, [conf('c', 10.2, 10.8)])?.id).toBe('c');
    expect(overlapping(req, [conf('c', 9, 12)])?.id).toBe('c');
  });

  it('back to back is not a clash — mentors do that on purpose', () => {
    expect(overlapping(req, [conf('c', 9, 10)])).toBe(null);
    expect(overlapping(req, [conf('c', 11, 12)])).toBe(null);
  });

  it('ignores anything not confirmed, and itself', () => {
    expect(
      overlapping(req, [booking({ id: 'x', status: 'pending', startsAt: at(10), endsAt: at(11) })]),
    ).toBe(null);
    expect(overlapping(req, [req])).toBe(null);
  });

  it('nothing in the way is null, not undefined', () => {
    expect(overlapping(req, [])).toBe(null);
  });
});

describe('who the other person is, and how reliable (backend #409)', () => {
  const mentorView = (over = {}) =>
    booking({ side: 'mentor', menteeAttendanceRate: 100, menteeAttendanceSessions: 12, ...over });

  it('a rate carries the sessions it is measured over', () => {
    expect(attendanceLine(mentorView())).toBe('Attendance rate: 100% (12 sessions)');
  });

  it('one session is a session, not sessions', () => {
    expect(attendanceLine(mentorView({ menteeAttendanceSessions: 1 }))).toBe(
      'Attendance rate: 100% (1 session)',
    );
  });

  it('a new mentee is not a bad one — no rate, no count, no claim', () => {
    // 0 with a null rate is a new mentee. "0 sessions" would read as a record.
    expect(attendanceLine(mentorView({ menteeAttendanceRate: null, menteeAttendanceSessions: 0 }))).toBe(
      'Mentee',
    );
  });

  it('a rate with no count is still a rate', () => {
    // The field is defaulted, so a 0 can arrive beside a real rate. Printing
    // "(0 sessions)" next to "90%" would contradict itself.
    expect(attendanceLine(mentorView({ menteeAttendanceRate: 90, menteeAttendanceSessions: 0 }))).toBe(
      'Attendance rate: 90%',
    );
  });

  it('a mentee sees the other side as a mentor, with no record at all', () => {
    expect(attendanceLine(booking({ side: 'mentee' }))).toBe('Mentor');
  });
});

describe('the party line', () => {
  it('reads as a person when both halves are there', () => {
    expect(partyLine(party({ degree: 'BSc', institution: 'FUTA' }))).toBe('BSc at FUTA');
  });

  it('degrades rather than disappearing when only one is', () => {
    expect(partyLine(party({ degree: 'MSc', institution: null }))).toBe('MSc');
    expect(partyLine(party({ degree: null, institution: 'FUTA' }))).toBe('FUTA');
  });

  it('is empty with no education entry, so nothing renders', () => {
    expect(partyLine(party({ degree: null, institution: null }))).toBe('');
  });
});

describe('the refund deadline comes from the server (backend #413)', () => {
  const confirmed = (over = {}) =>
    booking({ side: 'mentee', status: 'confirmed', startsAt: at(48), endsAt: at(49), ...over });

  it('refunds right up to the deadline, and at it', () => {
    // "Cancelling at exactly this instant still refunds" — so `<=`, not `<`.
    const deadline = at(10);
    expect(refundOnCancel(confirmed({ refundUntil: deadline }), new Date(at(9)))).toBe(true);
    expect(refundOnCancel(confirmed({ refundUntil: deadline }), new Date(deadline))).toBe(true);
  });

  it('does not refund a moment past it', () => {
    const deadline = at(10);
    expect(
      refundOnCancel(confirmed({ refundUntil: deadline }), new Date(Date.parse(deadline) + 1000)),
    ).toBe(false);
  });

  it('follows a window that is not twelve hours', () => {
    // The whole point: the window is deployment configuration. A 10-hour one
    // must refund at 10.5 hours out, where a baked-in 12 would refuse.
    const tenHoursOut = at(38); // the session is at +48
    expect(refundOnCancel(confirmed({ refundUntil: tenHoursOut }), new Date(at(37)))).toBe(true);
    expect(refundOnCancel(confirmed({ refundUntil: tenHoursOut }), new Date(at(39)))).toBe(false);
  });

  it('a mentor always refunds the mentee, deadline or not', () => {
    expect(
      refundOnCancel(confirmed({ side: 'mentor', refundUntil: at(10) }), new Date(at(47))),
    ).toBe(true);
  });

  it('falls back to twelve hours when the server sent no deadline', () => {
    // An older row or a deploy without the field must not silently stop
    // refunding.
    expect(refundOnCancel(confirmed({ refundUntil: null }), new Date(at(13)))).toBe(true);
    expect(refundOnCancel(confirmed({ refundUntil: null }), new Date(at(40)))).toBe(false);
  });

  it('reads the window back out of the deadline for the copy', () => {
    expect(refundWindowFor(confirmed({ refundUntil: at(38) }))).toBe(10);
    // No deadline, no derivation — the fallback, never a wrong number.
    expect(refundWindowFor(confirmed({ refundUntil: null }))).toBe(12);
    expect(refundWindowFor(confirmed({ refundUntil: 'not-a-date' }))).toBe(12);
  });
});
