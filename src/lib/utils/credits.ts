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
    total: Math.max(1, c.allowance),
    resetsOn: c.nextResetAt ? resetDay(c.nextResetAt) : null,
  };
}

/**
 * The reset is midnight UTC on the 1st (backend `next_reset_at`): name that
 * day in UTC, or a mentee west of UTC would read "Oct 31".
 */
export function resetDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
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

/** The pill's name, read in full ("3 of 4 credits left, resets Nov 1"). */
export function creditsAria(v: CreditsView): string {
  return v.resetsOn ? `${creditsTitle(v)}, resets ${v.resetsOn}` : creditsTitle(v);
}

export function creditsBody(v: CreditsView): string {
  if (isOut(v)) {
    return v.resetsOn
      ? `You’ve used this month’s credits. They reset on ${v.resetsOn}.`
      : 'You’ve used this month’s credits.';
  }
  return v.resetsOn
    ? `Each free session uses 1 credit. Your credits reset on ${v.resetsOn}.`
    : 'Each free session uses 1 credit.';
}
