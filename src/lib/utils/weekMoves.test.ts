import { isoWeekKey, readWeekMoves, weekMovesKey, writeWeekMoves } from './weekMoves';

describe('isoWeekKey', () => {
  it('numbers weeks from Monday, in the account’s zone', () => {
    // Sun Oct 25 2026 is the end of ISO week 43; Mon Oct 26 starts 44.
    expect(isoWeekKey(new Date('2026-10-25T12:00:00Z'), 'Africa/Lagos')).toBe('2026-43');
    expect(isoWeekKey(new Date('2026-10-26T12:00:00Z'), 'Africa/Lagos')).toBe('2026-44');
    // 23:30 UTC Sunday is already Monday in Lagos (UTC+1).
    expect(isoWeekKey(new Date('2026-10-25T23:30:00Z'), 'Africa/Lagos')).toBe('2026-44');
    expect(isoWeekKey(new Date('2026-10-25T23:30:00Z'), 'America/New_York')).toBe('2026-43');
  });

  it('puts the days around New Year in the ISO year they belong to', () => {
    // Thu Jan 1 2026 is in week 1 of 2026; Mon Dec 28 2026 is week 53.
    expect(isoWeekKey(new Date('2026-01-01T12:00:00Z'), 'UTC')).toBe('2026-01');
    expect(isoWeekKey(new Date('2026-12-28T12:00:00Z'), 'UTC')).toBe('2026-53');
    // Fri Jan 1 2027 still belongs to 2026's week 53.
    expect(isoWeekKey(new Date('2027-01-01T12:00:00Z'), 'UTC')).toBe('2026-53');
    expect(isoWeekKey(new Date('2027-01-04T12:00:00Z'), 'UTC')).toBe('2027-01');
  });
});

describe('week moves storage', () => {
  const key = weekMovesKey('m1', '2026-44');
  beforeEach(() => localStorage.clear());

  it('is keyed per mentor and week', () => {
    expect(key).toBe('ef-dash-week-m1-2026-44');
  });

  it('round-trips, keeping only known moves', () => {
    writeWeekMoves(key, ['share', 'hours']);
    expect(readWeekMoves(key)).toEqual(['share', 'hours']);
    localStorage.setItem(key, JSON.stringify(['hours', 'nonsense']));
    expect(readWeekMoves(key)).toEqual(['hours']);
  });

  it('reads nothing from a missing, broken or blocked store', () => {
    expect(readWeekMoves(key)).toEqual([]);
    localStorage.setItem(key, '{not json');
    expect(readWeekMoves(key)).toEqual([]);
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readWeekMoves(key)).toEqual([]);
    get.mockRestore();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeWeekMoves(key, ['share'])).not.toThrow();
    set.mockRestore();
  });
});
