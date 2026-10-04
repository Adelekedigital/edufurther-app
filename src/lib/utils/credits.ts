/**
 * A mentee's credits as the shell shows them (AppShell.dc.html "Credits
 * (mentee)", creditStyle=green, with backend #344's monthly/bonus split).
 * Pure: no data fetching here.
 *
 * The pill and the low/out states read the total (`left`): it's what can be
 * spent. The bar and title read the monthly credits only, so a full month is
 * "3 of 3" rather than "3 of 4" with the starter credit counted in. Bonus
 * credits (starter, invites, support grants) are their own lines.
 */
export type CreditsView = {
  left: number;
  monthlyLeft: number;
  monthlyTotal: number;
  /**
   * One line per expiry day: soonest first, never-expiring last. Groups the
   * backend splits by instant are merged by day, so two support grants that
   * lapse on the same day read as one line.
   */
  bonus: BonusGroup[];
  /**
   * Whether the monthly part shows (title, bar, reset). Not for a mentee who
   * doesn't get the monthly grant yet and holds none: "0 of 3 monthly" would
   * describe credits they don't receive.
   */
  showMonthly: boolean;
  /** When the monthly credits reset ("Nov 1"); null with no date or no monthly part. */
  resetsOn: string | null;
};

/** `expires` with no `expiresOn`: a date that couldn't be read. Never "never". */
export type BonusGroup = { count: number; expires: boolean; expiresOn: string | null };

type Credits = {
  balance: number;
  nextResetAt?: string | null;
  monthly: { balance: number; ceiling: number; expiresAt: string | null; unlocked: boolean };
  bonus: { balance: number; groups: { count: number; expiresAt: string | null }[] };
};

export function creditsView(
  c: Credits | null | undefined,
  now: Date = new Date(),
): CreditsView | null {
  if (!c) return null;
  const monthlyLeft = Math.max(0, c.monthly.balance);
  const showMonthly = c.monthly.unlocked || monthlyLeft > 0;
  const bonus: BonusGroup[] = [];
  for (const g of c.bonus.groups) {
    if (g.count <= 0) continue;
    const expiresOn = g.expiresAt ? lastDay(g.expiresAt, now) : null;
    const same = bonus.find((b) => b.expires === !!g.expiresAt && b.expiresOn === expiresOn);
    if (same) same.count += g.count;
    else bonus.push({ count: g.count, expires: !!g.expiresAt, expiresOn });
  }
  return {
    left: Math.max(0, c.balance),
    monthlyLeft,
    // Clamped: a late refund can briefly lift the balance past the ceiling,
    // and the bar never reads "4 of 3".
    monthlyTotal: Math.max(1, c.monthly.ceiling, monthlyLeft),
    bonus,
    showMonthly,
    resetsOn: showMonthly && c.nextResetAt ? resetDay(c.nextResetAt) : null,
  };
}

/**
 * The reset is midnight UTC on the 1st (backend `next_reset_at`): name that
 * day in UTC, or a mentee west of UTC would read "Oct 31".
 */
export function resetDay(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * `expires_at` is the instant credits stop working (midnight UTC on the 1st),
 * so the last day they work is the day before: "expire Oct 31".
 */
export function lastDay(iso: string, now: Date = new Date()): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const last = new Date(d.getTime() - 1);
  // A starter or support credit can run past this year: "Oct 31, 2027".
  return last.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(last.getUTCFullYear() !== now.getUTCFullYear() && { year: 'numeric' }),
    timeZone: 'UTC',
  });
}

/** Design: 1 left or none is "low" (yellow); none is "out". Totals, not monthly. */
export const isLow = (v: CreditsView) => v.left <= 1;
export const isOut = (v: CreditsView) => v.left === 0;

export function creditsTitle(v: CreditsView): string {
  // Design (creditSplit on): the total leads; Monthly/Bonus rows break it down.
  return isOut(v) ? 'No credits left' : `${v.left} ${v.left === 1 ? 'credit' : 'credits'} left`;
}

/**
 * The bar, one segment per credit (design creditSegs): bonus first (blue),
 * then monthly left (green), then monthly spent (grey). Low: all filled ones
 * yellow (CSS). No monthly part for a mentee without the grant.
 */
export type CreditSegment = 'bonus' | 'monthly' | 'empty';
export function creditSegments(v: CreditsView): CreditSegment[] {
  const bonus = v.bonus.reduce((n, g) => n + g.count, 0);
  const segs: CreditSegment[] = [
    ...Array<CreditSegment>(bonus).fill('bonus'),
    ...(v.showMonthly
      ? [
          ...Array<CreditSegment>(v.monthlyLeft).fill('monthly'),
          ...Array<CreditSegment>(Math.max(0, v.monthlyTotal - v.monthlyLeft)).fill('empty'),
        ]
      : []),
  ];
  return segs.length ? segs : ['empty'];
}

/**
 * The explainer's rows (design creditLines): "Monthly · Resets Nov 1 · 2 of
 * 3", then one "Bonus" row per expiry day ("Expires Dec 31", "Never
 * expires"; no date when it couldn't be read).
 */
export type CreditRow = { kind: 'monthly' | 'bonus'; label: string; sub: string; value: string };
export function creditRows(v: CreditsView): CreditRow[] {
  return [
    ...(v.showMonthly
      ? [
          {
            kind: 'monthly' as const,
            label: 'Monthly',
            sub: v.resetsOn ? `Resets ${v.resetsOn}` : '',
            value: `${v.monthlyLeft} of ${v.monthlyTotal}`,
          },
        ]
      : []),
    ...v.bonus.map((g) => ({
      kind: 'bonus' as const,
      label: 'Bonus',
      sub: !g.expires ? 'Never expires' : g.expiresOn ? `Expires ${g.expiresOn}` : '',
      value: String(g.count),
    })),
  ];
}

/** Design, under the rows. True to the backend: soonest-expiring first. */
export const SPEND_ORDER = 'Expiring credits are used first.';

/**
 * The pill's name. It starts with the words the pill shows ("4 credits"), so a
 * voice command for what's on screen finds it (WCAG 2.5.3): "4 credits left:
 * 3 monthly, 1 bonus, resets Nov 1", "No credits left, resets Nov 1".
 */
export function creditsAria(v: CreditsView): string {
  const bonus = v.bonus.reduce((n, g) => n + g.count, 0);
  const head = isOut(v)
    ? 'No credits left'
    : `${v.left} ${v.left === 1 ? 'credit' : 'credits'} left` +
      (bonus > 0 && v.showMonthly ? `: ${v.monthlyLeft} monthly, ${bonus} bonus` : '');
  return v.resetsOn ? `${head}, monthly resets ${v.resetsOn}` : head;
}

/**
 * Behind the explainer's "Refund policy" toggle, closed by default. Ours, not
 * the design's paragraph: backend decision 229 refunds a mentor no-show only
 * when the mentee joined, and declines and withdrawals refund too.
 */
export const REFUND_POLICY = {
  lead: 'You get the credit back if',
  items: [
    'your mentor declines or doesn’t reply',
    'your mentor cancels',
    'your mentor misses a session you joined',
    'you withdraw a request',
    'you cancel 12+ hours before',
  ],
};
