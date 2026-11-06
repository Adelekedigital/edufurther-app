import {
  creditsAria,
  creditRows,
  refundPolicy,
  creditSegments,
  creditsTitle,
  creditsView,
  isLow,
  isOut,
  lastDay,
  resetDay,
  summarySub,
  HOW_CREDITS_WORK,
  creditSteps,
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

describe('creditsView (decision 308: the level, and support credits as bonus)', () => {
  it('splits the total: the bar is monthly of the ceiling; bonus groups are their own lines', () => {
    expect(creditsView(api({ groups: [{ count: 1, expiresAt: null }] }))).toEqual({
      refundHours: null,
      left: 4,
      monthlyLeft: 3,
      monthlyTotal: 3,
      bonus: [{ count: 1, expires: false, expiresOn: null }],
      showMonthly: true,
      level: 3,
      resetsOn: 'Nov 1',
    });
    expect(creditsView(null)).toBeNull();
  });

  it('a late refund above the ceiling never reads "4 of 3"', () => {
    expect(creditsView(api({ monthly: 4 }))).toMatchObject({ monthlyLeft: 4, monthlyTotal: 4 });
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
    // Its row says nothing about when, never "Never expires".
    expect(creditRows(v!).find((r) => r.kind === 'bonus')?.sub).toBe('');
  });

  it('every level shows its monthly part, spent or not: level 1 with nothing left reads "0 of 1"', () => {
    const v = creditsView(api({ monthly: 0, ceiling: 1, unlocked: false }));
    expect(v).toMatchObject({
      left: 0,
      monthlyLeft: 0,
      monthlyTotal: 1,
      showMonthly: true,
      resetsOn: 'Nov 1',
    });
    expect(creditSegments(v!)).toEqual(['empty']);
    // Level 2, one left: "1 of 2".
    expect(creditsView(api({ monthly: 1, ceiling: 2, unlocked: false }))).toMatchObject({
      monthlyLeft: 1,
      monthlyTotal: 2,
      showMonthly: true,
    });
  });

  it('setup (level 0: setupCredits sets a ceiling of 0): no monthly part, no reset date', () => {
    const v = creditsView(api({ monthly: 0, ceiling: 0, unlocked: false }));
    expect(v).toMatchObject({ left: 0, showMonthly: false, resetsOn: null });
    expect(creditRows(v!)).toEqual([]);
  });

  it('no readable reset date: the next 1st in UTC, the backend’s rule', () => {
    const now = new Date('2026-10-31T23:30:00-04:00'); // Nov 1, 03:30 UTC
    expect(creditsView(api({ nextResetAt: null }), now)?.resetsOn).toBe('Dec 1');
    expect(
      creditsView(api({ nextResetAt: 'nope' }), new Date('2026-12-15T12:00:00Z'))?.resetsOn,
    ).toBe('Jan 1');
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

describe('copy (design creditSplit on)', () => {
  const v = (left: number, bonus: CreditsView['bonus'] = []): CreditsView => ({
    refundHours: null,
    left,
    monthlyLeft: left - bonus.reduce((n, g) => n + g.count, 0),
    monthlyTotal: 3,
    bonus,
    showMonthly: true,
    level: 3,
    resetsOn: 'Nov 1',
  });
  const starter: CreditsView['bonus'] = [{ count: 1, expires: false, expiresOn: null }];

  it('title is the total; the pill name starts with it (WCAG 2.5.3)', () => {
    const three = v(3, starter);
    expect(creditsTitle(three)).toBe('3 credits left');
    expect(creditsTitle(v(1))).toBe('1 credit left');
    expect(creditsTitle(v(0))).toBe('No credits left');
    expect(creditsAria(three)).toBe('3 credits left: 2 monthly, 1 bonus, monthly resets Nov 1');
    expect(creditsAria(v(3))).toBe('3 credits left, monthly resets Nov 1');
    expect(creditsAria(v(0))).toBe('No credits left, monthly resets Nov 1');
  });

  it('bar: bonus first, then monthly left, then monthly spent', () => {
    expect(creditSegments(v(3, starter))).toEqual(['bonus', 'monthly', 'monthly', 'empty']);
    expect(creditSegments(v(0))).toEqual(['empty', 'empty', 'empty']);
    // No monthly grant: only the bonus credits; nothing at all still draws one.
    expect(creditSegments({ ...v(1, starter), showMonthly: false })).toEqual(['bonus']);
    expect(creditSegments({ ...v(0), showMonthly: false })).toEqual(['empty']);
  });

  it('a late refund above the ceiling: "4 of 4", never "4 of 3"; four green segments', () => {
    const v = creditsView(api({ monthly: 4 }))!;
    expect(creditRows(v)[0]?.value).toBe('4 of 4');
    expect(creditSegments(v)).toEqual(['monthly', 'monthly', 'monthly', 'monthly']);
  });

  it('the filled segments always add up to the total in the title', () => {
    for (const o of [
      { groups: [{ count: 1, expiresAt: null }] },
      { monthly: 0, groups: [{ count: 2, expiresAt: '2026-11-15T00:00:00Z' }] },
      { monthly: 4 },
      { monthly: 0, unlocked: false, groups: [{ count: 1, expiresAt: null }] },
    ]) {
      const v = creditsView(api(o))!;
      expect(creditSegments(v).filter((k) => k !== 'empty')).toHaveLength(v.left);
    }
  });

  it('rows: Monthly with its reset, one Bonus row per expiry day', () => {
    expect(
      creditRows(v(4, [...starter, { count: 1, expires: true, expiresOn: 'Dec 31' }])),
    ).toEqual([
      { kind: 'monthly', label: 'Monthly', sub: 'Resets Nov 1', value: '2 of 3', unit: 'credits' },
      { kind: 'bonus', label: 'Bonus', sub: 'Never expires', value: '1', unit: 'credit' },
      { kind: 'bonus', label: 'Bonus', sub: 'Expires Dec 31', value: '1', unit: 'credit' },
    ]);
    // No monthly grant: no Monthly row. No bonus: no Bonus row.
    expect(creditRows({ ...v(1, starter), showMonthly: false }).map((r) => r.kind)).toEqual([
      'bonus',
    ]);
    expect(creditRows(v(3)).map((r) => r.kind)).toEqual(['monthly']);
  });

  it('low and out follow the total, not the monthly count', () => {
    expect(isLow(v(2))).toBe(false);
    expect(isLow(v(1))).toBe(true);
    // 0 monthly but a bonus credit to spend: low, not out.
    expect(isOut(v(1, starter))).toBe(false);
    expect(isOut(v(0))).toBe(true);
  });
});

describe('the refund policy names the deployment’s window (backend #413)', () => {
  it('uses the hours /me gave', () => {
    expect(refundPolicy(10).items).toContain('you cancel 10+ hours before');
  });

  it('falls back to twelve when /me said nothing', () => {
    // Not a silent zero, and not a wrong promise: the same twelve the booking
    // rules fall back to.
    expect(refundPolicy(null).items).toContain('you cancel 12+ hours before');
    expect(refundPolicy(undefined).items).toContain('you cancel 12+ hours before');
    expect(refundPolicy(0).items).toContain('you cancel 12+ hours before');
  });

  it('says nothing else about timing, so only this line can go stale', () => {
    const others = refundPolicy(10).items.filter((i) => !i.includes('hours before'));
    expect(others.some((i) => /\d/.test(i))).toBe(false);
  });
});

describe('the account menu line and "How credits work"', () => {
  const base: CreditsView = {
    refundHours: null,
    left: 1,
    monthlyLeft: 0,
    monthlyTotal: 3,
    bonus: [{ count: 1, expires: false, expiresOn: null }],
    showMonthly: false,
    level: 0,
    resetsOn: null,
  };
  it('the reset when there is a monthly part; nothing in setup; never "null"', () => {
    expect(summarySub({ ...base, showMonthly: true, resetsOn: 'Nov 1' })).toBe('Resets Nov 1');
    expect(summarySub(base)).toBeNull();
    // Decision 308 retired the starter credit: no "For your first session" line.
    expect(summarySub({ ...base, left: 1 })).not.toBe('For your first session');
  });
  it('the credit-level rules (decision 308): no em dashes, nothing that never expires', () => {
    expect(HOW_CREDITS_WORK).toHaveLength(5);
    for (const t of HOW_CREDITS_WORK) {
      expect(t).not.toMatch(/—/);
      expect(t).not.toMatch(/never expires/i);
    }
  });
});

describe('"Your monthly credits" (decision 308 steps)', () => {
  const at = (level: number) =>
    creditSteps({
      ...creditsView({
        balance: 0,
        monthly: { balance: 0, ceiling: level, expiresAt: null, unlocked: level === 3 },
        bonus: { balance: 0, groups: [] },
      })!,
    });
  it('always three steps with what each pays; ticked up to the level', () => {
    expect(at(0).map((s) => s.done)).toEqual([false, false, false]);
    expect(at(1).map((s) => s.done)).toEqual([true, false, false]);
    expect(at(2).map((s) => s.done)).toEqual([true, true, false]);
    expect(at(3).map((s) => s.done)).toEqual([true, true, true]);
    expect(at(3).map((s) => s.value)).toEqual(['1 a month', '2 a month', '3 a month']);
  });
  it('the level is the ceiling, 0 only in setup, never above 3', () => {
    const v = (ceiling: number) =>
      creditsView({
        balance: 0,
        monthly: { balance: 0, ceiling, expiresAt: null, unlocked: false },
        bonus: { balance: 0, groups: [] },
      })!.level;
    expect([v(0), v(1), v(2), v(3), v(5)]).toEqual([0, 1, 2, 3, 3]);
  });
});
