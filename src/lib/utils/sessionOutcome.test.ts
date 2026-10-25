import { describe, expect, it } from 'vitest';
import type { Booking, BookingParty } from '@/types/booking';
import { sampleBookingFor, sampleParty } from './bookingTestFixtures';
import { missedBy, missedTone, missedWaitMin, outcomeView } from './sessionOutcome';

type Attendance = BookingParty['attendance'];
// Arrivals close 15 minutes after the start, as the backend's row says (JOIN_CLOSES).
const missed = (side: Booking['side'], mine: Attendance, theirs: Attendance) =>
  sampleBookingFor({
    status: 'noShow',
    side,
    myAttendance: mine,
    startsAt: '2026-10-04T16:00:00Z',
    joinClosesAt: '2026-10-04T16:15:00Z',
    other: sampleParty({ id: 'gbenga', firstName: 'Gbenga', attendance: theirs }),
  });
const view = (b: Booking, over: Partial<Parameters<typeof outcomeView>[0]> = {}) =>
  outcomeView({
    booking: b,
    canBook: true,
    reviewable: true,
    reviewed: false,
    home: '/dashboard',
    ...over,
  });
const labels = (v: ReturnType<typeof view>) => v.actions.map((a) => a.label);

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

describe('missedWaitMin', () => {
  it('reads the wait from the row, so the copy names the backend’s rule', () => {
    expect(missedWaitMin(missed('mentee', 'noShow', 'attended'))).toBe(15);
    // Whatever the row says: a session shorter than the window closes at its end.
    expect(
      missedWaitMin(
        sampleBookingFor({
          startsAt: '2026-10-04T16:00:00Z',
          joinClosesAt: '2026-10-04T16:10:00Z',
        }),
      ),
    ).toBe(10);
  });

  it('an older row with no window falls back to the backend’s 15 minutes', () => {
    expect(missedWaitMin(sampleBookingFor({ joinClosesAt: null }))).toBe(15);
    // Nonsense on the row reads as the rule, never "0" or "NaN" minutes.
    expect(
      missedWaitMin(
        sampleBookingFor({
          startsAt: '2026-10-04T16:00:00Z',
          joinClosesAt: '2026-10-04T16:00:00Z',
        }),
      ),
    ).toBe(15);
    expect(missedWaitMin(sampleBookingFor({ joinClosesAt: 'not a time' }))).toBe(15);
  });
});

// PRD Session Join, Missed: viewer × who missed → icon, tone, title, body, actions.
describe('outcomeView, the six missed cards', () => {
  it.each([
    [
      'mentee, mentee missed',
      missed('mentee', 'noShow', 'attended'),
      {
        icon: 'event_busy',
        tone: 'red',
        title: 'You missed this session',
        body: 'Gbenga waited 15 minutes from the start. The credit for this session is used, and it counts as a missed session.',
        askReason: true,
      },
      [['Book another time', null]],
    ],
    [
      'mentee, mentor missed',
      missed('mentee', 'attended', 'noShow'),
      {
        icon: 'replay',
        tone: 'green',
        title: 'Gbenga didn’t join',
        body: 'Your credit is back.',
        askReason: false,
      },
      [
        ['Find another mentor', '/explore'],
        ['Book Gbenga again', null],
      ],
    ],
    [
      'mentee, nobody joined',
      missed('mentee', 'noShow', 'noShow'),
      {
        icon: 'help',
        tone: 'grey',
        title: 'Neither of you joined',
        body: 'Neither of you joined within 15 minutes of the start, so the credit for this session is used.',
        askReason: false,
      },
      [['Book another time', null]],
    ],
    [
      'mentor, mentee missed',
      missed('mentor', 'attended', 'noShow'),
      {
        icon: 'person_off',
        tone: 'grey',
        title: 'Gbenga didn’t join',
        body: 'You waited 15 minutes from the start, so this counts as a completed session for you.',
        askReason: false,
      },
      [['Go to Bookings', '/bookings']],
    ],
    [
      'mentor, mentor missed',
      missed('mentor', 'noShow', 'attended'),
      {
        icon: 'event_busy',
        tone: 'red',
        title: 'You missed this session',
        body: 'Gbenga waited 15 minutes from the start, so Gbenga’s credit is back.',
        askReason: true,
      },
      // "Offer a new time" is the founder's open question; Go to Bookings until then.
      [['Go to Bookings', '/bookings']],
    ],
    [
      'mentor, nobody joined',
      missed('mentor', 'noShow', 'noShow'),
      {
        icon: 'help',
        tone: 'grey',
        title: 'Neither of you joined',
        body: 'Neither of you joined within 15 minutes of the start, so Gbenga’s credit for this session is used.',
        askReason: false,
      },
      [['Go to Bookings', '/bookings']],
    ],
  ] as const)('%s', (_, b, card, actions) => {
    const v = view(b);
    expect(v).toMatchObject({ kind: 'missed', ...card });
    expect(v.actions.map((a) => [a.label, a.href])).toEqual(actions);
  });

  it('the mentee’s Book actions open the modal here (no link), primary last', () => {
    const v = view(missed('mentee', 'attended', 'noShow'));
    expect(v.actions.map((a) => [a.key, a.variant])).toEqual([
      ['find', 'secondary'],
      ['book', 'primary'],
    ]);
  });

  it('never says the dropped lines, nor a pronoun', () => {
    for (const side of ['mentee', 'mentor'] as const)
      for (const [mine, theirs] of [
        ['noShow', 'attended'],
        ['attended', 'noShow'],
        ['noShow', 'noShow'],
      ] as const) {
        const v = view(missed(side, mine, theirs));
        const text = `${v.title} ${v.kind === 'missed' ? v.body : ''}`;
        expect(text).not.toMatch(/Booking pauses|we’ve told|\b(she|her|he|his|their)\b|—/i);
      }
  });

  it('no record: says so, and claims nothing about credit', () => {
    const v = view(missed('mentee', 'pending', 'pending'));
    expect(v).toMatchObject({ title: 'This session was missed', askReason: false });
    if (v.kind === 'missed') expect(v.body).not.toMatch(/credit|refund/);
  });

  it('never offers booking to someone who can’t book (mentors)', () => {
    for (const b of [
      missed('mentee', 'attended', 'noShow'),
      missed('mentee', 'noShow', 'attended'),
      missed('mentee', 'noShow', 'noShow'),
    ])
      expect(labels(view(b, { canBook: false }))).toEqual(['Go to Bookings']);
  });
  it('never offers booking a mentor whose account is gone', () => {
    const gone = sampleBookingFor({
      ...missed('mentee', 'attended', 'noShow'),
      other: sampleParty({
        id: 'gbenga',
        firstName: 'Deleted user',
        deleted: true,
        attendance: 'noShow',
      }),
    });
    expect(labels(view(gone))).toEqual(['Go to Bookings']);
  });
});

describe('outcomeView, completed', () => {
  const done = (side: Booking['side']) =>
    sampleBookingFor({
      status: 'completed',
      side,
      other: sampleParty({ id: 'gbenga', firstName: 'Gbenga' }),
    });

  it('asks the mentee for a review, with Book again beside it; both open here', () => {
    const v = view(done('mentee'));
    expect(v).toMatchObject({
      kind: 'completed',
      title: 'How was your session with Gbenga?',
      body: 'Your review helps other mentees pick the right mentor.',
    });
    expect(v.actions).toEqual([
      { key: 'review', label: 'Leave a review', href: null, variant: 'primary' },
      { key: 'book', label: 'Book again', href: null, variant: 'secondary' },
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
    expect(v.actions).toEqual([
      { key: 'book', label: 'Book again', href: null, variant: 'primary' },
    ]);
  });

  it('already reviewed or past the window: complete, with Book again', () => {
    const v = view(done('mentee'), { reviewable: false });
    expect(v.title).toBe('Your session with Gbenga is complete.');
    expect(labels(v)).toEqual(['Book again']);
  });

  it('the mentor: complete, with Go to Home and no next-steps box', () => {
    const v = view(done('mentor'), { home: '/dashboard' });
    expect(v).toEqual({
      kind: 'completed',
      title: 'Your session with Gbenga is complete.',
      body: null,
      thanks: null,
      actions: [{ key: 'home', label: 'Go to Home', href: '/dashboard', variant: 'primary' }],
    });
  });
});
