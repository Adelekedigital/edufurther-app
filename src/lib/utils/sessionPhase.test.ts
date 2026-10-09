import { describe, expect, it } from 'vitest';
import { sampleBookingFor } from './bookingTestFixtures';
import {
  entryFor,
  formatClock,
  formatWait,
  isFinal,
  joinOpensLabel,
  lobbyClock,
  lobbyDate,
  lobbyTimes,
  opensBeforeMin,
  providerJoin,
  providerName,
  sessionPhase,
} from './sessionPhase';

// A 30-minute session at 17:00 UTC (6:00 pm in Lagos), window 16:55–17:15.
const b = sampleBookingFor({
  startsAt: '2026-10-04T17:00:00Z',
  endsAt: '2026-10-04T17:30:00Z',
  durationMin: 30,
  joinOpensAt: '2026-10-04T16:55:00Z',
  joinClosesAt: '2026-10-04T17:15:00Z',
  doorClosesAt: '2026-10-04T17:30:00Z',
});
const at = (hhmmss: string) => new Date(`2026-10-04T${hhmmss}Z`);

describe('sessionPhase', () => {
  it('is upcoming until the window opens, and soon from that instant', () => {
    expect(sessionPhase(b, at('16:54:59'))).toBe('upcoming');
    expect(sessionPhase(b, at('16:55:00'))).toBe('soon');
  });

  it('is ongoing from the start through the last second of the window', () => {
    expect(sessionPhase(b, at('17:00:00'))).toBe('ongoing');
    expect(sessionPhase(b, at('17:15:00'))).toBe('ongoing');
  });

  it('is closed once the window shuts while the session still runs (backend #379)', () => {
    expect(sessionPhase(b, at('17:15:01'))).toBe('closed');
    expect(sessionPhase(b, at('17:29:59'))).toBe('closed');
  });

  it('is settling once over and still confirmed — never inferred as missed', () => {
    expect(sessionPhase(b, at('17:30:00'))).toBe('settling');
    expect(sessionPhase(b, at('19:00:00'))).toBe('settling');
  });

  it('reads the settled outcome from the status once the session is over', () => {
    expect(sessionPhase({ ...b, status: 'completed' }, at('17:30:00'))).toBe('completed');
    expect(sessionPhase({ ...b, status: 'noShow' }, at('17:30:00'))).toBe('missed');
  });

  it('keeps a session settled mid-call on the clock until it ends (backend #380)', () => {
    expect(sessionPhase({ ...b, status: 'completed' }, at('17:16:00'))).toBe('closed');
    expect(sessionPhase({ ...b, status: 'noShow' }, at('17:10:00'))).toBe('ongoing');
  });

  it.each(['pending', 'cancelled', 'declined', 'expired', 'withdrawn'] as const)(
    'sends %s elsewhere',
    (status) => expect(sessionPhase({ ...b, status }, at('16:00:00'))).toBe('elsewhere'),
  );

  it('falls back to the backend window on an older row it never stamped (10 min, #391)', () => {
    const old = { ...b, joinOpensAt: null, joinClosesAt: null };
    expect(sessionPhase(old, at('16:49:59'))).toBe('upcoming');
    expect(sessionPhase(old, at('16:50:00'))).toBe('soon');
    expect(sessionPhase(old, at('17:15:01'))).toBe('closed');
  });

  it('never has a closed phase when the session ends with the window', () => {
    const short = { ...b, endsAt: '2026-10-04T17:15:00Z', durationMin: 15 };
    expect(sessionPhase(short, at('17:14:59'))).toBe('ongoing');
    expect(sessionPhase(short, at('17:15:00'))).toBe('settling');
  });
});

describe('entryFor', () => {
  const joined = '2026-10-04T16:57:00Z';
  const entry = (time: string, me: string | null, booking = b) =>
    entryFor(booking, me, sessionPhase(booking, at(time)), at(time));

  it('is a first arrival through /join while the window is open', () => {
    expect(entry('16:54:59', null)).toBeNull();
    expect(entry('16:55:00', null)).toBe('join');
    expect(entry('17:15:00', null)).toBe('join');
  });

  it('lets no first-timer in after the window (product, 2026-10-08)', () => {
    expect(entry('17:15:01', null)).toBeNull();
  });

  it('is the door for anyone who has joined, until the door closes', () => {
    expect(entry('16:58:00', joined)).toBe('door');
    expect(entry('17:20:00', joined)).toBe('door');
    expect(entry('17:29:59', joined)).toBe('door');
    expect(entry('17:30:00', joined)).toBeNull();
  });

  it('a 10-minute session: arrivals and the room both close at its end (backend #388)', () => {
    const short = {
      ...b,
      endsAt: '2026-10-04T17:10:00Z',
      durationMin: 10,
      joinClosesAt: '2026-10-04T17:10:00Z',
      doorClosesAt: '2026-10-04T17:10:00Z',
    };
    expect(entry('17:09:59', joined, short)).toBe('door');
    expect(entry('17:09:59', null, short)).toBe('join');
    expect(entry('17:10:00', joined, short)).toBeNull();
    expect(entry('17:10:00', null, short)).toBeNull();
  });
});

describe('phase predicates', () => {
  it('treats only settled or foreign states as final', () => {
    expect(isFinal('settling')).toBe(false);
    expect(isFinal('completed')).toBe(true);
    expect(isFinal('elsewhere')).toBe(true);
  });
});

describe('clock', () => {
  it('formats under and over an hour, and never goes negative', () => {
    expect(formatClock(8 * 60_000)).toBe('08:00');
    expect(formatClock(6300_000)).toBe('1:45:00');
    expect(formatClock(-5000)).toBe('00:00');
  });

  it('says whole days once the wait passes a day, never a 73-hour clock', () => {
    expect(formatWait(23 * 3_600_000 + 59 * 60_000)).toBe('23:59:00');
    expect(formatWait(24 * 3_600_000)).toBe('24 hours');
    expect(formatWait(47 * 3_600_000 + 59 * 60_000)).toBe('47 hours');
    expect(formatWait(48 * 3_600_000)).toBe('2 days');
    expect(formatWait(73 * 3_600_000)).toBe('3 days');
    expect(lobbyClock(b, 'upcoming', new Date('2026-10-01T17:00:00Z'))).toEqual({
      label: 'Starts in',
      value: '3 days',
      sub: 'Join opens 5 minutes before the start',
    });
    expect(joinOpensLabel(b, new Date('2026-10-01T17:00:00Z'))).toBe('Join session');
  });

  it('counts down to the start, with when Join opens', () => {
    expect(lobbyClock(b, 'upcoming', at('15:15:00'))).toEqual({
      label: 'Starts in',
      value: '1:45:00',
      sub: 'Join opens in 1:40:00',
    });
    expect(lobbyClock(b, 'soon', at('16:52:00'))!.sub).toBe('Join opens in 03:00');
    expect(lobbyClock(b, 'soon', at('16:56:00'))!.sub).toBe('Join is open');
  });

  it('has no clock once started: the call may run on another platform (product, 2026-10-08)', () => {
    expect(lobbyClock(b, 'ongoing', at('17:12:00'))).toBeNull();
    expect(lobbyClock(b, 'closed', at('17:29:30'))).toBeNull();
  });

  it('has no clock once over', () => {
    expect(lobbyClock(b, 'settling', at('17:40:00'))).toBeNull();
  });

  it('labels the locked button and reads the window from the row', () => {
    expect(joinOpensLabel(b, at('16:50:00'))).toBe('Join opens in 05:00');
    expect(opensBeforeMin(b)).toBe(5);
  });
});

describe('meta line', () => {
  it('names the day and the range in the viewer’s zone', () => {
    expect(lobbyDate(b.startsAt, 'Africa/Lagos')).toBe('Sun, Oct 4');
    expect(lobbyTimes(b, 'Africa/Lagos')).toBe('6:00 – 6:30 pm');
  });

  it('keeps both halves of the day when they differ', () => {
    const noon = { ...b, startsAt: '2026-10-04T10:30:00Z', endsAt: '2026-10-04T11:30:00Z' };
    expect(lobbyTimes(noon, 'Africa/Lagos')).toBe('11:30 am – 12:30 pm');
  });

  it('names each venue, and words a custom link neutrally', () => {
    expect(providerName('daily')).toBe('EduFurther video');
    expect(providerName(null)).toBeNull();
    expect(providerJoin('google_meet').join).toBe('Join on Google Meet');
    expect(providerJoin('custom').hint).toBe('Opens the meeting link in a new tab.');
  });
});
