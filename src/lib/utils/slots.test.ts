import { formatDay } from './format';
import { dayKey, groupSlotsByDay } from './slots';

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
