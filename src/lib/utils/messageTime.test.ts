import { describe, expect, it } from 'vitest';
import { daysAgo, dayKey, rowTime, separatorLabel } from './messageTime';

const Z = 'Africa/Lagos'; // UTC+1, no DST
const now = new Date('2026-10-27T10:00:00Z'); // Tue Oct 27, 11:00 in Lagos

describe('messageTime', () => {
  it('counts calendar days in the zone, not 24-hour steps', () => {
    expect(daysAgo('2026-10-27T00:30:00Z', Z, now)).toBe(0);
    // 23:30 UTC on the 26th is 00:30 on the 27th in Lagos: today, not yesterday.
    expect(daysAgo('2026-10-26T23:30:00Z', Z, now)).toBe(0);
    expect(daysAgo('2026-10-26T22:30:00Z', Z, now)).toBe(1);
  });

  it('row time: time today, Yesterday, weekday, then the short date', () => {
    expect(rowTime('2026-10-27T08:41:00Z', Z, now)).toBe('9:41 am');
    expect(rowTime('2026-10-26T12:00:00Z', Z, now)).toBe('Yesterday');
    expect(rowTime('2026-10-22T12:00:00Z', Z, now)).toBe('Thursday');
    expect(rowTime('2026-10-13T12:00:00Z', Z, now)).toBe('Oct 13');
  });

  it('separator: Today, Yesterday, weekday, then the day label', () => {
    expect(separatorLabel('2026-10-27T08:00:00Z', Z, now)).toBe('Today');
    expect(separatorLabel('2026-10-26T08:00:00Z', Z, now)).toBe('Yesterday');
    expect(separatorLabel('2026-10-21T08:00:00Z', Z, now)).toBe('Wednesday');
    expect(separatorLabel('2026-10-13T08:00:00Z', Z, now)).toBe('Tue, Oct 13');
  });

  it('a future instant (a clock ahead of ours) still reads as today', () => {
    expect(rowTime('2026-10-27T10:05:00Z', Z, now)).toBe('11:05 am');
  });

  it('day keys group by the zone’s date', () => {
    expect(dayKey('2026-10-26T23:30:00Z', Z)).toBe('2026-10-27');
  });
});
