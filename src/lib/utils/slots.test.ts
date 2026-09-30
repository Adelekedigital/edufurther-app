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

  it('asks from two days before today to three past the window (end exclusive): the window plus five days', () => {
    expect(slotWindow('America/Los_Angeles', 28, la)).toEqual({
      start: '2026-09-25',
      end: '2026-10-28',
    });
    // East of UTC: Auckland is already on Sep 28, so its margin starts two days before that.
    expect(slotWindow('Pacific/Auckland', 28, la)).toEqual({
      start: '2026-09-26',
      end: '2026-10-29',
    });
  });

  // #101: the widest gap between two zones' dates is two days (UTC+14 against
  // UTC−12). A slot at either edge of the viewer's window falls on a mentor date
  // up to two days out, and must still be inside the requested range.
  it('covers the viewer’s first minute when the mentor is 26 hours behind', () => {
    const viewer = 'Pacific/Kiritimati'; // UTC+14
    const mentor = 'Etc/GMT+12'; // UTC−12
    const now = new Date('2026-09-28T00:00:00Z'); // 14:00 on Sep 28 for the viewer
    const { start } = slotWindow(viewer, 28, now);
    const firstMinute = '2026-09-27T10:00:00Z'; // the viewer's Sep 28, 00:00
    expect(dayKey(firstMinute, viewer)).toBe('2026-09-28');
    expect(dayKey(firstMinute, mentor)).toBe('2026-09-26'); // today − 2
    expect(dayKey(firstMinute, mentor) >= start).toBe(true);
  });

  it('covers the viewer’s last minute when the mentor is 26 hours ahead', () => {
    const viewer = 'Etc/GMT+12'; // UTC−12
    const mentor = 'Pacific/Kiritimati'; // UTC+14
    const now = new Date('2026-09-28T20:00:00Z'); // 08:00 on Sep 28 for the viewer
    const { end } = slotWindow(viewer, 28, now);
    const lastMinute = '2026-10-26T11:59:00Z'; // the viewer's Oct 25 (window's last day), 23:59
    expect(dayKey(lastMinute, viewer)).toBe('2026-10-25');
    expect(dayKey(lastMinute, mentor)).toBe('2026-10-27'); // last day + 2
    expect(dayKey(lastMinute, mentor) < end).toBe(true); // end is exclusive
  });

  it('follows the session type’s window: plus five days around it, and its days only', () => {
    // A 7-day window: the request spans 12 days, the picker shows 7.
    expect(slotWindow('America/Los_Angeles', 7, la)).toEqual({
      start: '2026-09-25',
      end: '2026-10-07',
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
