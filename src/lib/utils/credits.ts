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
  /**
   * Whether the monthly credits held lapse at month end. False only when some
   * are held and none expire (migrated balances can be non-expiring); null
   * `expires_at` with none held still lapses, so test the balance first.
   */
  monthlyLapses: boolean;
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
    monthlyLapses: monthlyLeft === 0 || c.monthly.expiresAt !== null,
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
  if (isOut(v)) return 'No credits left';
  if (!v.showMonthly) return `${v.left} ${v.left === 1 ? 'credit' : 'credits'} left`;
  return `${v.monthlyLeft} of ${v.monthlyTotal} monthly credits left`;
}

/** "+1 bonus credit · never expires", "+2 bonus credits · expire Oct 31". */
export function bonusLine(g: BonusGroup): string {
  const one = g.count === 1;
  const head = `+${g.count} bonus ${one ? 'credit' : 'credits'}`;
  if (!g.expires) return `${head} · ${one ? 'never expires' : 'never expire'}`;
  // An unreadable date: say nothing about when, never "never".
  return g.expiresOn ? `${head} · ${one ? 'expires' : 'expire'} ${g.expiresOn}` : head;
}

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
 * "Your credits": the design's explainer with the product's existing "How does
 * it work?" copy folded in (product, 2026-10-03), kept to what the backend
 * does today. No "3 every month" promise: the monthly grant needs an invite
 * first, and the app has no invite feature yet (#158). Refunds (backend decision 229): a request withdrawn, declined
 * or unanswered; a mentor cancelling; a mentor no-show only when the mentee
 * joined (attendance is whoever pressed Join); a mentee cancelling with at
 * least 12 hours to go (the boundary included).
 */
export function creditsLead(v: CreditsView): string | null {
  if (!isOut(v)) return null;
  return v.showMonthly ? 'You’ve used this month’s credits.' : 'You’ve used your credits.';
}

export function creditsPoints(v: CreditsView): string[] {
  const reset = v.resetsOn
    ? `Monthly credits reset on ${v.resetsOn}.`
    : 'Monthly credits reset at the start of each month.';
  return [
    'Each session you request uses 1 credit.',
    // Held monthly credits that never expire (a data anomaly): no claim.
    ...(v.showMonthly ? [v.monthlyLapses ? `${reset} Unused ones don’t carry over.` : reset] : []),
    // No "invites": there's no invite feature to point at yet.
    ...(v.bonus.length > 0
      ? ['Bonus credits come from your starter credit or support. Some never expire.']
      : []),
    'Credits that expire soonest are used first.',
  ];
}

/** Behind the explainer's "Refund policy" toggle, closed by default. */
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

export const CREDITS_PURPOSE =
  'Credits help you book the sessions that move you forward, and give mentors the time to support you well.';
