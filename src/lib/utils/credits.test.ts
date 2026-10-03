import {
  creditsAria,
  creditsBody,
  creditsTitle,
  creditsView,
  isLow,
  isOut,
  resetDay,
} from './credits';

describe('creditsView', () => {
  it('maps /me credits; none for a viewer without them', () => {
    expect(creditsView({ balance: 3, allowance: 4, nextResetAt: '2026-11-01T00:00:00Z' })).toEqual({
      left: 3,
      total: 4,
      resetsOn: 'Nov 1',
    });
    expect(creditsView(null)).toBeNull();
  });

  it('no reset date: no "Resets" line', () => {
    expect(creditsView({ balance: 2, allowance: 4 })?.resetsOn).toBeNull();
  });
});

describe('resetDay', () => {
  it('names the reset day in UTC, so a mentee west of UTC still reads "Nov 1", not "Oct 31"', () => {
    // Midnight UTC on Nov 1 is 8 pm on Oct 31 in New York.
    expect(resetDay('2026-11-01T00:00:00Z')).toBe('Nov 1');
  });
});

describe('design states and copy (AppShell.dc.html, creditStyle=green)', () => {
  const v = (left: number) => ({ left, total: 4, resetsOn: 'Nov 1' });

  it('plenty: not low', () => {
    expect(isLow(v(2))).toBe(false);
    expect(creditsTitle(v(3))).toBe('3 of 4 credits left');
    expect(creditsAria(v(3))).toBe('3 of 4 credits left, resets Nov 1');
    expect(creditsBody(v(3))).toBe('Each free session uses 1 credit. Your credits reset on Nov 1.');
  });

  it('1 left is low; none is out', () => {
    expect(isLow(v(1))).toBe(true);
    expect(isOut(v(1))).toBe(false);
    expect(isOut(v(0))).toBe(true);
    expect(creditsTitle(v(0))).toBe('No credits left');
    expect(creditsBody(v(0))).toBe('You’ve used this month’s credits. They reset on Nov 1.');
  });
});
