import {
  bonusLine,
  creditsAria,
  creditsLead,
  creditsPoints,
  creditsTitle,
  creditsView,
  isLow,
  isOut,
  lastDay,
  resetDay,
  type CreditsView,
} from './credits';

const api = (o: {
  balance?: number;
  monthly?: number;
  ceiling?: number;
  monthlyExpires?: string | null;
  unlocked?: boolean;
  groups?: { count: number; expiresAt: string | null }[];
  nextResetAt?: string | null;
}) => {
  const groups = o.groups ?? [];
  const bonus = groups.reduce((n, g) => n + g.count, 0);
  const monthly = o.monthly ?? 3;
  return {
    balance: o.balance ?? monthly + bonus,
    nextResetAt: o.nextResetAt === undefined ? '2026-11-01T00:00:00Z' : o.nextResetAt,
    monthly: {
      balance: monthly,
      ceiling: o.ceiling ?? 3,
      expiresAt: o.monthlyExpires === undefined ? '2026-11-01T00:00:00Z' : o.monthlyExpires,
      unlocked: o.unlocked ?? true,
    },
    bonus: { balance: bonus, groups },
  };
};

describe('creditsView (backend #344: monthly and bonus)', () => {
  it('splits the total: the bar is monthly of the ceiling; bonus groups are their own lines', () => {
    expect(creditsView(api({ groups: [{ count: 1, expiresAt: null }] }))).toEqual({
      left: 4,
      monthlyLeft: 3,
      monthlyTotal: 3,
      bonus: [{ count: 1, expires: false, expiresOn: null }],
      showMonthly: true,
      monthlyLapses: true,
      resetsOn: 'Nov 1',
    });
    expect(creditsView(null)).toBeNull();
  });

  it('a late refund above the ceiling never reads "4 of 3"', () => {
    expect(creditsView(api({ monthly: 4 }))).toMatchObject({ monthlyLeft: 4, monthlyTotal: 4 });
  });

  it('null monthly expiry: lapses when none are held; held non-expiring (migrated) ones do not', () => {
    expect(creditsView(api({ monthly: 0, monthlyExpires: null }))?.monthlyLapses).toBe(true);
    expect(creditsView(api({ monthly: 2, monthlyExpires: null }))?.monthlyLapses).toBe(false);
  });

  it('bonus expiry reads as the last day the credits work (the day before, in UTC)', () => {
    const v = creditsView(api({ groups: [{ count: 2, expiresAt: '2026-11-01T00:00:00Z' }] }));
    expect(v?.bonus).toEqual([{ count: 2, expires: true, expiresOn: 'Oct 31' }]);
  });

  it('groups lapsing on the same day merge into one line', () => {
    const v = creditsView(
      api({
        groups: [
          { count: 1, expiresAt: '2026-11-15T09:00:00Z' },
          { count: 2, expiresAt: '2026-11-15T17:00:00Z' },
          { count: 1, expiresAt: null },
        ],
      }),
    );
    expect(v?.bonus).toEqual([
      { count: 3, expires: true, expiresOn: 'Nov 15' },
      { count: 1, expires: false, expiresOn: null },
    ]);
  });

  it('an unreadable expiry is not "never expires", and does not merge with it', () => {
    const v = creditsView(
      api({
        groups: [
          { count: 1, expiresAt: 'not-a-date' },
          { count: 1, expiresAt: null },
        ],
      }),
    );
    expect(v?.bonus).toEqual([
      { count: 1, expires: true, expiresOn: null },
      { count: 1, expires: false, expiresOn: null },
    ]);
    expect(bonusLine(v!.bonus[0]!)).toBe('+1 bonus credit');
  });

  it('not unlocked and none held: no monthly part, no reset date', () => {
    const v = creditsView(
      api({ monthly: 0, unlocked: false, groups: [{ count: 1, expiresAt: null }] }),
    );
    expect(v).toMatchObject({ left: 1, showMonthly: false, resetsOn: null });
    // Not unlocked but holding some (migrated): the monthly part still shows.
    expect(creditsView(api({ monthly: 2, unlocked: false }))?.showMonthly).toBe(true);
  });

  it('no reset date: no "Resets" line', () => {
    expect(creditsView(api({ nextResetAt: null }))?.resetsOn).toBeNull();
  });
});

describe('dates', () => {
  it('names the reset day in UTC, so a mentee west of UTC still reads "Nov 1", not "Oct 31"', () => {
    // Midnight UTC on Nov 1 is 8 pm on Oct 31 in New York.
    expect(resetDay('2026-11-01T00:00:00Z')).toBe('Nov 1');
  });

  it('the last day: across a year and a leap day; the year only when not this year', () => {
    const now = new Date('2026-10-03T12:00:00Z');
    expect(lastDay('2027-01-01T00:00:00Z', now)).toBe('Dec 31');
    expect(lastDay('2028-03-01T00:00:00Z', now)).toBe('Feb 29, 2028');
    expect(lastDay('2027-11-01T00:00:00Z', now)).toBe('Oct 31, 2027');
    expect(lastDay('2026-11-01T00:00:00Z', now)).toBe('Oct 31');
  });

  it('an unreadable date shows no date, never "Invalid Date"', () => {
    expect(resetDay('not-a-date')).toBeNull();
    expect(lastDay('not-a-date')).toBeNull();
  });
});

describe('copy', () => {
  const v = (left: number, bonus: CreditsView['bonus'] = []): CreditsView => ({
    left,
    monthlyLeft: left - bonus.reduce((n, g) => n + g.count, 0),
    monthlyTotal: 3,
    bonus,
    showMonthly: true,
    monthlyLapses: true,
    resetsOn: 'Nov 1',
  });

  it('title counts monthly credits; the pill name starts with the total (WCAG 2.5.3)', () => {
    const four = v(4, [{ count: 1, expires: false, expiresOn: null }]);
    expect(creditsTitle(four)).toBe('3 of 3 monthly credits left');
    expect(creditsAria(four)).toBe('4 credits left: 3 monthly, 1 bonus, monthly resets Nov 1');
    expect(creditsAria(v(3))).toBe('3 credits left, monthly resets Nov 1');
    expect(creditsAria(v(1))).toBe('1 credit left, monthly resets Nov 1');
    expect(creditsAria(v(0))).toBe('No credits left, monthly resets Nov 1');
    // Not unlocked: the total, no monthly parts.
    expect(
      creditsTitle({
        ...v(1, [{ count: 1, expires: false, expiresOn: null }]),
        showMonthly: false,
      }),
    ).toBe('1 credit left');
  });

  it('bonus lines: singular and plural, dated or never', () => {
    expect(bonusLine({ count: 1, expires: false, expiresOn: null })).toBe(
      '+1 bonus credit · never expires',
    );
    expect(bonusLine({ count: 2, expires: true, expiresOn: 'Oct 31' })).toBe(
      '+2 bonus credits · expire Oct 31',
    );
  });

  it('low and out follow the total, not the monthly count', () => {
    expect(isLow(v(2))).toBe(false);
    expect(isLow(v(1))).toBe(true);
    // 0 monthly but a bonus credit to spend: low, not out.
    expect(isOut(v(1, [{ count: 1, expires: false, expiresOn: null }]))).toBe(false);
    expect(isOut(v(0))).toBe(true);
    expect(creditsTitle(v(0))).toBe('No credits left');
    expect(creditsLead(v(0))).toBe('You’ve used this month’s credits.');
    expect(creditsLead(v(3))).toBeNull();
    expect(creditsLead({ ...v(0), showMonthly: false })).toBe('You’ve used your credits.');
  });

  it('points: no "3 every month" promise; "don\'t carry over" only when the monthly ones lapse', () => {
    expect(creditsPoints(v(4, [{ count: 1, expires: false, expiresOn: null }]))).toEqual([
      'Each session you request uses 1 credit.',
      'Monthly credits reset on Nov 1. Unused ones don’t carry over.',
      'Bonus credits come from your starter credit or support. Some never expire.',
      'Credits that expire soonest are used first.',
    ]);
    // No bonus held: no bonus point. No monthly part: no reset point.
    expect(creditsPoints(v(3))).not.toContainEqual(expect.stringMatching(/Bonus/));
    expect(creditsPoints({ ...v(3), showMonthly: false })).toEqual([
      'Each session you request uses 1 credit.',
      'Credits that expire soonest are used first.',
    ]);
    expect(creditsPoints({ ...v(3), monthlyLapses: false })[1]).toBe(
      'Monthly credits reset on Nov 1.',
    );
  });
});
