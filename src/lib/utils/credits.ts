/**
 * A mentee's monthly credits as the shell shows them (AppShell.dc.html
 * "Credits (mentee)", creditStyle=green). Pure: no data fetching here.
 */
export type CreditsView = {
  left: number;
  total: number;
  /** "Nov 1", or null when the backend gave no reset date. */
  resetsOn: string | null;
};

type Credits = { balance: number; allowance: number; nextResetAt?: string | null };

export function creditsView(c: Credits | null | undefined): CreditsView | null {
  if (!c) return null;
  return {
    left: Math.max(0, c.balance),
    // The bar can never read "5 of 4".
    total: Math.max(1, c.allowance, c.balance),
    resetsOn: c.nextResetAt ? resetDay(c.nextResetAt) : null,
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

/** Design: 1 left or none is "low" (yellow); none is "out". */
export const isLow = (v: CreditsView) => v.left <= 1;
export const isOut = (v: CreditsView) => v.left === 0;

export function creditsTitle(v: CreditsView): string {
  return isOut(v) ? 'No credits left' : `${v.left} of ${v.total} credits left`;
}

/**
 * The pill's name. It starts with the words the pill shows ("3 credits"), so a
 * voice command for what's on screen finds it (WCAG 2.5.3): "3 credits left
 * of 4, resets Nov 1", "1 credit left of 4…", "No credits left…".
 */
export function creditsAria(v: CreditsView): string {
  const head = isOut(v)
    ? 'No credits left'
    : `${v.left} ${v.left === 1 ? 'credit' : 'credits'} left of ${v.total}`;
  return v.resetsOn ? `${head}, resets ${v.resetsOn}` : head;
}

/**
 * "Your credits": the design's explainer with the product's existing "How does
 * it work?" copy folded in (product, 2026-10-03), kept to what the backend
 * does today. Refunds: withdraw, decline and expiry return the credit;
 * cancelling a confirmed session doesn't yet (backend #335), so no promise.
 */
export function creditsLead(v: CreditsView): string | null {
  return isOut(v) ? 'You’ve used this month’s credits.' : null;
}

export function creditsPoints(v: CreditsView): string[] {
  return [
    'Each session you request uses 1 credit.',
    'If you withdraw a request, or your mentor declines it or doesn’t reply in time, the credit comes back.',
    v.resetsOn
      ? `Your credits reset on ${v.resetsOn}.`
      : 'Your credits reset at the start of each month.',
  ];
}

export const CREDITS_PURPOSE =
  'Credits help you book the sessions that move you forward, and give mentors the time to support you well.';
