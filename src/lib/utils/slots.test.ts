import { formatDay } from './format';
import {
  dayKey,
  groupSlotsByDay,
  slotWindow,
  visibleDays,
  weekIndexOf,
  weekOfDays,
  weeksIn,
} from './slots';

describe('groupSlotsByDay', () => {
  // Joshua on the dev backend: first slot 05:30Z on Sep 30.
  const slots = ['2026-09-30T06:15:00Z', '2026-09-30T05:30:00Z', '2026-10-04T10:00:00Z'];

  it('groups by the viewer’s calendar day, in time order', () => {
    expect(groupSlotsByDay(slots, 'America/New_York')).toEqual([
      {
        date: '2026-09-30',
        slots: [{ startsAt: '2026-09-30T05:30:00Z' }, { startsAt: '2026-09-30T06:15:00Z' }],
      },
      { date: '2026-10-04', slots: [{ startsAt: '2026-10-04T10:00:00Z' }] },
    ]);
  });

  it('moves a slot across midnight when the zone changes', () => {
    // 03:00Z is Sep 30 in Lagos but still Sep 29 in Los Angeles.
    const late = ['2026-09-30T03:00:00Z'];
    expect(groupSlotsByDay(late, 'Africa/Lagos')[0]!.date).toBe('2026-09-30');
    expect(groupSlotsByDay(late, 'America/Los_Angeles')[0]!.date).toBe('2026-09-29');
  });

  it('returns no days for no slots', () => {
    expect(groupSlotsByDay([], 'UTC')).toEqual([]);
  });
});

describe('dayKey', () => {
  it('uses the given zone, not the machine’s', () => {
    expect(dayKey('2026-09-28T02:00:00Z', 'America/New_York')).toBe('2026-09-27');
    expect(dayKey('2026-09-28T02:00:00Z', 'Africa/Lagos')).toBe('2026-09-28');
  });
});

describe('formatDay', () => {
  it('formats the calendar date itself, whatever zone it was grouped in', () => {
    // A day key from a UTC+13 viewer: before, noon UTC read in +13 became Sep 29.
    const key = dayKey('2026-09-27T12:30:00Z', 'Pacific/Auckland');
    expect(key).toBe('2026-09-28');
    expect(formatDay(key)).toEqual({ weekday: 'Mon', date: 'Sep 28' });
  });
});

describe('slotWindow / visibleDays (review of #20)', () => {
  // 6pm in Los Angeles on Sep 27 is already Sep 28 in UTC.
  const la = new Date('2026-09-28T01:00:00Z');

  it('asks from the viewer’s today to a day past the window (the window plus one day)', () => {
    expect(slotWindow('America/Los_Angeles', 28, la)).toEqual({
      start: '2026-09-27',
      end: '2026-10-26',
    });
    // East of UTC: Auckland is already on Sep 28, so its request starts there.
    expect(slotWindow('Pacific/Auckland', 28, la)).toEqual({
      start: '2026-09-28',
      end: '2026-10-27',
    });
  });

  it('follows the session type’s window: the window plus a day, and its days only', () => {
    // A 7-day window: the request spans 9 days, the picker shows 7.
    expect(slotWindow('America/Los_Angeles', 7, la)).toEqual({
      start: '2026-09-27',
      end: '2026-10-05',
    });
    const days = ['2026-09-27', '2026-10-03', '2026-10-04'].map((date) => ({ date, slots: [] }));
    expect(visibleDays(days, 'America/Los_Angeles', la, 7).map((d) => d.date)).toEqual([
      '2026-09-27',
      '2026-10-03',
    ]);
    expect(weeksIn(7)).toBe(1);
    expect(weeksIn(14)).toBe(2);
    expect(weeksIn(56)).toBe(8);
    expect(weeksIn(10)).toBe(2);
    // A 10-day window: the second page stops at its end (3 days), not 7.
    expect(weekOfDays([], 1, 'America/Los_Angeles', la, 10)).toHaveLength(3);
    expect(weekOfDays([], 0, 'America/Los_Angeles', la, 10)).toHaveLength(7);
  });

  it('keeps only today … today+27 in the viewer’s zone', () => {
    const days = ['2026-09-26', '2026-09-27', '2026-10-24', '2026-10-25'].map((date) => ({
      date,
      slots: [{ startsAt: `${date}T18:00:00Z` }],
    }));
    expect(visibleDays(days, 'America/Los_Angeles', la).map((d) => d.date)).toEqual([
      '2026-09-27',
      '2026-10-24',
    ]);
  });
});

describe('weekIndexOf', () => {
  const now = new Date('2026-09-27T12:00:00Z'); // Sunday in UTC
  it('counts 7-day pages from today in the viewer zone', () => {
    expect(weekIndexOf('2026-09-27T20:00:00Z', 'UTC', now)).toBe(0);
    expect(weekIndexOf('2026-10-03T23:00:00Z', 'UTC', now)).toBe(0);
    expect(weekIndexOf('2026-10-04T00:30:00Z', 'UTC', now)).toBe(1);
    expect(weekIndexOf('2026-10-24T09:00:00Z', 'UTC', now)).toBe(3);
  });
  it('is negative for a day before today', () => {
    expect(weekIndexOf('2026-09-26T09:00:00Z', 'UTC', now)).toBe(-1);
  });
  it('uses the zone for both days, around midnight', () => {
    // 03:30Z on Oct 4 is still Oct 3 in New York: same page as today.
    expect(weekIndexOf('2026-10-04T03:30:00Z', 'America/New_York', now)).toBe(0);
    expect(weekIndexOf('2026-10-04T03:30:00Z', 'UTC', now)).toBe(1);
  });
  it('counts calendar days across a DST change', () => {
    // Europe/London leaves summer time on Oct 25 2026.
    const lateOct = new Date('2026-10-24T12:00:00Z');
    expect(weekIndexOf('2026-10-31T10:00:00Z', 'Europe/London', lateOct)).toBe(1);
    expect(weekIndexOf('2026-10-30T23:30:00Z', 'Europe/London', lateOct)).toBe(0);
  });
});
