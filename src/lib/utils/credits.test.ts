import {
  creditsAria,
  creditsLead,
  creditsPoints,
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
    // Starts with what the pill shows ("3 credits"): WCAG 2.5.3.
    expect(creditsAria(v(3))).toBe('3 credits left of 4, resets Nov 1');
    expect(creditsAria(v(1))).toBe('1 credit left of 4, resets Nov 1');
    expect(creditsAria(v(0))).toBe('No credits left, resets Nov 1');
    expect(creditsLead(v(3))).toBeNull();
    expect(creditsPoints(v(3))).toEqual([
      'Each session you request uses 1 credit.',
      'You get it back if you withdraw the request, or your mentor declines it, doesn’t reply in time, cancels, or misses the session.',
      'Cancel at least 12 hours before and you get it back; later than that, the credit is used.',
      'Your credits reset on Nov 1.',
    ]);
  });

  it('1 left is low; none is out', () => {
    expect(isLow(v(1))).toBe(true);
    expect(isOut(v(1))).toBe(false);
    expect(isOut(v(0))).toBe(true);
    expect(creditsTitle(v(0))).toBe('No credits left');
    expect(creditsLead(v(0))).toBe('You’ve used this month’s credits.');
  });
});

describe('hardening', () => {
  it('an unreadable reset date shows no date, never "Invalid Date"', () => {
    expect(resetDay('not-a-date')).toBeNull();
    expect(
      creditsView({ balance: 2, allowance: 4, nextResetAt: 'not-a-date' })?.resetsOn,
    ).toBeNull();
  });

  it('a balance above the allowance never reads "5 of 4"', () => {
    expect(creditsView({ balance: 5, allowance: 4 })).toMatchObject({ left: 5, total: 5 });
  });
});
