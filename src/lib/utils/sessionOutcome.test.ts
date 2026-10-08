import { describe, expect, it } from 'vitest';
import type { Booking, BookingParty } from '@/types/booking';
import { sampleBookingFor, sampleParty } from './bookingTestFixtures';
import { missedBy, missedTone, outcomeView } from './sessionOutcome';

type Attendance = BookingParty['attendance'];
const missed = (side: Booking['side'], mine: Attendance, theirs: Attendance) =>
  sampleBookingFor({
    status: 'noShow',
    side,
    myAttendance: mine,
    other: sampleParty({ id: 'gbenga', firstName: 'Gbenga', attendance: theirs }),
  });
const view = (b: Booking, over: Partial<Parameters<typeof outcomeView>[0]> = {}) =>
  outcomeView({ booking: b, canBook: true, reviewable: true, reviewed: false, ...over });

describe('missedBy', () => {
  it.each([
    ['noShow', 'attended', 'me'],
    ['attended', 'noShow', 'other'],
    ['leftEarly', 'noShow', 'other'],
    ['noShow', 'noShow', 'both'],
    ['pending', 'pending', 'unknown'],
    ['noShow', 'pending', 'unknown'],
  ] as const)('mine %s, theirs %s → %s', (mine, theirs, who) => {
    expect(missedBy(missed('mentee', mine, theirs))).toBe(who);
  });
});

describe('missedTone', () => {
  it('is red when the viewer missed it, green when the mentor missed a mentee’s, grey otherwise', () => {
    expect(missedTone(missed('mentee', 'noShow', 'attended'))).toBe('red');
    expect(missedTone(missed('mentee', 'attended', 'noShow'))).toBe('green');
    expect(missedTone(missed('mentor', 'attended', 'noShow'))).toBe('grey');
    expect(missedTone(missed('mentee', 'noShow', 'noShow'))).toBe('grey');
  });
});

describe('outcomeView, missed', () => {
  it('the mentor missed it: the mentee’s credit is back, with ways to rebook', () => {
    const v = view(missed('mentee', 'attended', 'noShow'));
    expect(v).toMatchObject({
      kind: 'missed',
      tone: 'green',
      title: 'Gbenga didn’t join. Your credit is back.',
    });
    expect(v.actions.map((a) => [a.label, a.href])).toEqual([
      ['Find another mentor', '/explore'],
      ['Rebook with Gbenga', '/mentors/gbenga'],
    ]);
  });

  it('the mentee missed it: not refunded, book another time', () => {
    const v = view(missed('mentee', 'noShow', 'attended'));
    expect(v.title).toBe('You missed this session');
    if (v.kind === 'missed') expect(v.body).toContain('Missed sessions aren’t refunded');
    expect(v.actions.map((a) => a.label)).toEqual(['Book another time']);
  });

  it('the mentor missed it, seen by the mentor: the mentee’s credit is back', () => {
    const v = view(missed('mentor', 'noShow', 'attended'));
    expect(v.title).toBe('You missed this session');
    if (v.kind === 'missed')
      expect(v.body).toBe('Gbenga joined, but you didn’t, so their credit is back.');
    expect(v.actions.map((a) => a.label)).toEqual(['Go to Bookings']);
  });

  it('the mentee missed it, seen by the mentor: no claim about the mentor’s own record', () => {
    const v = view(missed('mentor', 'attended', 'noShow'));
    expect(v.title).toBe('Gbenga didn’t join');
    if (v.kind === 'missed') expect(v.body).not.toMatch(/counts as|ranking|waited/);
  });

  it('neither joined: never promises a refund the backend doesn’t give', () => {
    const mentee = view(missed('mentee', 'noShow', 'noShow'));
    expect(mentee.title).toBe('Neither of you joined');
    if (mentee.kind === 'missed')
      expect(mentee.body).toBe('This session isn’t refunded, but you can book another time.');
    const mentor = view(missed('mentor', 'noShow', 'noShow'));
    if (mentor.kind === 'missed') expect(mentor.body).not.toMatch(/credit|refund/);
  });

  it('no record: says so, and claims nothing about credit', () => {
    const v = view(missed('mentee', 'pending', 'pending'));
    expect(v.title).toBe('This session was missed');
    if (v.kind === 'missed') expect(v.body).not.toMatch(/credit|refund/);
  });

  it('never offers booking to someone who can’t book (mentors)', () => {
    for (const b of [
      missed('mentee', 'attended', 'noShow'),
      missed('mentee', 'noShow', 'attended'),
      missed('mentee', 'noShow', 'noShow'),
    ])
      expect(view(b, { canBook: false }).actions.map((a) => a.label)).toEqual(['Go to Bookings']);
  });

  it('only the mentor-alone case mentions a credit coming back', () => {
    const credit = (b: Booking) => {
      const v = view(b);
      return /credit is back/.test(`${v.title} ${v.kind === 'missed' ? v.body : ''}`);
    };
    expect(credit(missed('mentee', 'attended', 'noShow'))).toBe(true);
    expect(credit(missed('mentor', 'noShow', 'attended'))).toBe(true);
    expect(credit(missed('mentee', 'noShow', 'attended'))).toBe(false);
    expect(credit(missed('mentee', 'noShow', 'noShow'))).toBe(false);
  });
});

describe('outcomeView, completed', () => {
  const done = (side: Booking['side']) =>
    sampleBookingFor({
      status: 'completed',
      side,
      other: sampleParty({ id: 'gbenga', firstName: 'Gbenga' }),
    });

  it('asks the mentee for a review, opened here, with Book again beside it', () => {
    const v = view(done('mentee'));
    expect(v).toMatchObject({ kind: 'completed', title: 'How was your session with Gbenga?' });
    expect(v.actions).toEqual([
      { key: 'review', label: 'Leave a review', href: null, variant: 'primary' },
      { key: 'book', label: 'Book again', href: '/mentors/gbenga', variant: 'secondary' },
    ]);
  });

  it('offers nothing while it is still being checked whether the session can be reviewed', () => {
    expect(view(done('mentee'), { reviewable: 'loading' }).actions).toEqual([]);
  });

  it('a failed check says so, with a retry, and keeps Book again', () => {
    const v = view(done('mentee'), { reviewable: 'error' });
    expect(v.body).toBe('We couldn’t check whether you can review this session.');
    expect(v.actions.map((a) => [a.key, a.label])).toEqual([
      ['retryReview', 'Try again'],
      ['book', 'Book again'],
    ]);
  });

  it('after a review sent here: thanks, and Book again', () => {
    const v = view(done('mentee'), { reviewed: true });
    expect(v).toMatchObject({ title: null, thanks: 'Thanks, your review is on Gbenga’s profile.' });
    expect(v.actions.map((a) => a.label)).toEqual(['Book again']);
  });

  it('already reviewed or past the window: complete, with Book again', () => {
    const v = view(done('mentee'), { reviewable: false });
    expect(v.title).toBe('Your session with Gbenga is complete.');
    expect(v.actions.map((a) => a.label)).toEqual(['Book again']);
  });

  it('the mentor gets no review or booking actions', () => {
    const v = view(done('mentor'));
    expect(v.title).toBe('Nice work. Session complete.');
    expect(v.actions.map((a) => a.label)).toEqual(['Go to Bookings']);
  });
});
