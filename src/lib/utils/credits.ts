/**
 * A mentee's credits as the shell shows them (AppShell.dc.html "Credits
 * (mentee)", creditStyle=green), on the credit levels (backend decision 308,
 * edufurtherbe #571, #574, #575): a month pays the mentee's level (1 for a
 * finished profile, 2 once their first invited friend finishes theirs, 3 once
 * they have also attended a session), and the 1st resets the balance to it.
 * Pure: no data fetching here.
 *
 * The pill, titles and low/out states read the total (`left`): it's what can
 * be spent. The bar has one segment per credit: bonus, then monthly left,
 * then monthly spent. "Your credits" breaks the total into a Monthly row
 * (the level's part, `monthly.balance` of `monthly.ceiling`) and Bonus rows
 * (support grants and their refunds only: starter and invite credits are now
 * the level, not bonus).
 */
export type CreditsView = {
  left: number;
  /**
   * The deployment's mentee refund window in hours, for the policy line.
   * A session's own deadline is its `refundUntil`; this is for copy that has
   * no session to hand.
   */
  refundHours: number | null;
  monthlyLeft: number;
  monthlyTotal: number;
  /**
   * One line per expiry day: soonest first, never-expiring last. Groups the
   * backend splits by instant are merged by day, so two support grants that
   * lapse on the same day read as one line.
   */
  bonus: BonusGroup[];
  /**
   * Whether the monthly part shows (the Monthly row, the green and grey
   * segments, the reset): for every mentee with a level, spent or not. Not at
   * level 0 (not onboarded): "0 of 1" would describe a credit they don't get
   * until onboarding.
   */
  showMonthly: boolean;
  /**
   * When the monthly credits reset ("Nov 1"); null only with no monthly part.
   * Without a readable `next_reset_at` it is the next 1st (UTC), which is the
   * backend's rule, so the reset line never goes missing or reads "null".
   */
  resetsOn: string | null;
  /**
   * The step reached (decision 308, `monthly.level`, edufurtherbe #576): 0
   * not onboarded, 1 profile, 2 + first friend, 3 + a session. Ticks the
   * card's ladder. Not `ceiling`: that is what the month pays, which only
   * matches the step on the default 1/2/3 ladder.
   */
  level: number;
};

/** `expires` with no `expiresOn`: a date that couldn't be read. Never "never". */
export type BonusGroup = { count: number; expires: boolean; expiresOn: string | null };

type Credits = {
  balance: number;
  nextResetAt?: string | null;
  monthly: {
    balance: number;
    ceiling: number;
    /** 0 to 3; null (an older API) falls back to the ceiling. */
    level?: number | null;
    expiresAt: string | null;
    unlocked: boolean;
  };
  bonus: { balance: number; groups: { count: number; expiresAt: string | null }[] };
};

export function creditsView(
  c: Credits | null | undefined,
  now: Date = new Date(),
  refundHours: number | null = null,
): CreditsView | null {
  if (!c) return null;
  const monthlyLeft = Math.max(0, c.monthly.balance);
  const level = Math.min(3, Math.max(0, c.monthly.level ?? c.monthly.ceiling));
  // Every level pays a month; only level 0 (not onboarded) has none.
  const showMonthly = level > 0 || monthlyLeft > 0;
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
    refundHours,
    monthlyLeft,
    // Clamped: a refund can lift the balance past the level until the 1st,
    // and the bar never reads "4 of 3".
    monthlyTotal: Math.max(1, c.monthly.ceiling, monthlyLeft),
    bonus,
    showMonthly,
    resetsOn: showMonthly ? resetsOnFor(c.nextResetAt, now) : null,
    level,
  };
}

/**
 * The monthly reset day ("Nov 1"): `next_reset_at`, else the next 1st (UTC),
 * which is the backend's rule, so the line never goes missing or reads "null".
 */
export function resetsOnFor(
  nextResetAt: string | null | undefined,
  now: Date = new Date(),
): string {
  return (nextResetAt ? resetDay(nextResetAt) : null) ?? resetDay(nextFirst(now))!;
}

/** Midnight UTC on the next 1st: the backend's reset (`end_of_month`). */
function nextFirst(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
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
 * The line under the title (owner, 2026-11-13: the legacy card's tiers, kept).
 * Measured against what the month pays, not a fixed five: a level pays 1 to 3,
 * so "1 left" can also be a full month, and then it is the last one (the card
 * is yellow from 1, so the words match the colour). Every credit ends on the
 * 1st (decision 308), so "this month" is true for bonus ones too. None in
 * setup (no monthly part): there is no month to be on track with.
 * Reviewed with edufurther-ux-writer.
 */
export function creditsStatus(v: CreditsView): string | null {
  if (!v.showMonthly) return null;
  if (isOut(v)) return 'All used up for this month';
  if (v.left === 1) return 'Last one this month. Make it count';
  return v.left >= v.monthlyTotal ? 'You’re on track' : 'Use them with intention';
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
export type CreditRow = {
  kind: 'monthly' | 'bonus';
  label: string;
  sub: string;
  value: string;
  /** Read after the value, not shown: "1" alone says nothing to a screen reader. */
  unit: string;
};
export function creditRows(v: CreditsView): CreditRow[] {
  return [
    ...(v.showMonthly
      ? [
          {
            kind: 'monthly' as const,
            label: 'Monthly',
            sub: v.resetsOn ? `Resets ${v.resetsOn}` : '',
            value: `${v.monthlyLeft} of ${v.monthlyTotal}`,
            unit: 'credits',
          },
        ]
      : []),
    ...v.bonus.map((g) => ({
      kind: 'bonus' as const,
      label: 'Bonus',
      sub: !g.expires ? 'Never expires' : g.expiresOn ? `Expires ${g.expiresOn}` : '',
      value: String(g.count),
      unit: g.count === 1 ? 'credit' : 'credits',
    })),
  ];
}

/**
 * The account menu's line under the bar (design creditSub): "Resets Nov 1".
 * Null in setup (no monthly part). The old "For your first session" line
 * described the never-expiring starter credit, which decision 308 retired.
 */
export function summarySub(v: CreditsView): string | null {
  return v.resetsOn ? `Resets ${v.resetsOn}` : null;
}

/**
 * "How credits work" in the explainer (design howList). The credit levels,
 * backend decision 308 (edufurtherbe #571, #574, #575; owner 2026-11-05): a month
 * pays the mentee's level (1 for a finished profile, 2 once their first
 * invited friend finishes theirs, 3 once they have also attended a session),
 * the 1st resets every balance to it and nothing carries over, and a level
 * reached mid-month tops up the difference. The terms are the card's own row
 * names, Monthly and Bonus (support grants only), so a mentee can match the
 * rules to what they see. No credit "never expires".
 */
export const HOW_CREDITS_WORK = [
  'One credit books one session.',
  'Only your first friend counts, and the friend and the session can come in either order.',
  'Monthly credits reset on the 1st. Unused credits don’t carry over.',
  'Finish a step during the month and we add the extra credits right away.',
  'Bonus credits are ones our team adds. They also end on the 1st.',
] as const;

/**
 * "Your monthly credits" in the card (owner, 2026-11-06: one pattern for
 * every mentee, whatever their step): the three steps of decision 308, each
 * with what it pays, ticked up to the mentee's level. Same list in setup
 * (nothing ticked) and at 3 (all ticked), so it always says why.
 */
export const CREDIT_STEPS_LABEL = 'Your monthly credits';
export type CreditStep = { key: string; label: string; value: string; done: boolean };
export function creditSteps(v: CreditsView): CreditStep[] {
  return [
    { key: 'profile', label: 'Finish your profile', value: '1 a month' },
    { key: 'friend', label: 'A friend you invited finishes their profile', value: '2 a month' },
    { key: 'session', label: 'Attend a session too', value: '3 a month' },
  ].map((s, i) => ({ ...s, done: v.level >= i + 1 }));
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
 * Behind the explainer's "Refund policy" toggle, closed by default. Ours, not
 * the design's paragraph: backend decision 229 refunds a mentor no-show only
 * when the mentee joined, and declines and withdrawals refund too.
 *
 * A function, not a constant, because the last line names the refund window —
 * deployment configuration since backend #413 (`MENTEE_CANCEL_REFUND_HOURS`).
 * Written as a literal it was right until somebody changed the setting, and
 * then wrong with nothing failing.
 */
export function refundPolicy(hours: number | null | undefined) {
  const window = hours && hours > 0 ? hours : FALLBACK_REFUND_HOURS;
  return {
    lead: 'You get the credit back if',
    items: [
      'your mentor declines or doesn’t reply',
      'your mentor cancels',
      'your mentor misses a session you joined',
      'you withdraw a request',
      `you cancel ${window}+ hours before`,
    ],
  };
}

/** Only when `/me` did not say; the same twelve the booking rules fall back to. */
const FALLBACK_REFUND_HOURS = 12;
