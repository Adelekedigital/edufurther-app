/**
 * Admin Analytics (PRD 31) number rules: windows, the change against the
 * previous period, and how each kind of number reads. Pure; every tab uses
 * these so a rate reads the same everywhere.
 */
import { formatCount } from './format';

export type WindowKey = '7d' | '30d' | '90d';

/** The window: one of the presets ending today, or whole UTC days, inclusive. */
export type AnalyticsWindow = { kind: WindowKey } | { kind: 'custom'; from: string; to: string };

export const DEFAULT_WINDOW: AnalyticsWindow = { kind: '30d' };

/** The earliest day the date picker offers (PRD: `from` no earlier than 2024-06-01). */
export const ANALYTICS_MIN_DAY = '2024-06-01';

const PRESET_DAYS: Record<WindowKey, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** "Nov 3", for a UTC calendar date. */
export const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

/** The window as query params: the preset, or `from` and `to` (the same date twice for one day). */
export function windowParams(w: AnalyticsWindow, compare: boolean): Record<string, string> {
  const base: Record<string, string> =
    w.kind === 'custom' ? { from: w.from, to: w.to } : { window: w.kind };
  return { ...base, compare: String(compare) };
}

/** A stable key for the query cache. */
export const windowKey = (w: AnalyticsWindow) =>
  w.kind === 'custom' ? `${w.from}_${w.to}` : w.kind;

/** Days in the window, inclusive. */
export function windowDays(w: AnalyticsWindow): number {
  if (w.kind !== 'custom') return PRESET_DAYS[w.kind];
  return Math.round((Date.parse(w.to) - Date.parse(w.from)) / 864e5) + 1;
}

/** "Last 30 days", "On Nov 3" or "Nov 3 to Nov 7" (PRD window rules). */
export function windowLabel(w: AnalyticsWindow): string {
  if (w.kind !== 'custom') return `Last ${PRESET_DAYS[w.kind]} days`;
  return w.from === w.to ? `On ${shortDate(w.from)}` : `${shortDate(w.from)} to ${shortDate(w.to)}`;
}

/** The Custom option once applied: "Nov 3" or "Nov 3 – Nov 7". */
export function customLabel(w: AnalyticsWindow): string {
  if (w.kind !== 'custom') return 'Custom';
  return w.from === w.to ? shortDate(w.from) : `${shortDate(w.from)} – ${shortDate(w.to)}`;
}

/**
 * The picker's draft after a click (Admin Analytics.dc.html `pickDay`): the
 * first click picks a day, a second makes a range in either order, a third
 * starts again.
 */
export function nextDraft(
  draft: { from: string; to: string } | null,
  day: string,
): { from: string; to: string } {
  if (!draft || draft.from !== draft.to) return { from: day, to: day };
  return day < draft.from ? { from: day, to: draft.from } : { from: draft.from, to: day };
}

/** Every day from `from` to `to`, inclusive (the picker's selected band). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 864e5) {
    out.push(new Date(t).toISOString().slice(0, 10));
    if (out.length > 1000) break;
  }
  return out;
}

// ---- Numbers ----------------------------------------------------------------

/** A number and its previous-period value (null: compare off, or a "now" number). */
export type Metric = { value: number | null; previous: number | null };

/** How a number's change reads (PRD change rules). */
export type ChangeKind = 'count' | 'rate' | 'abs';

export type Change = {
  text: string;
  tone: 'good' | 'bad' | 'flat';
  icon: 'arrow_upward' | 'arrow_downward' | 'remove';
};

const one = (n: number) => Math.round(n * 10) / 10;
/** At most one decimal, a whole number without ".0": 6.8, 84. */
const trim = (n: number) => String(one(n));
const signed = (n: number, s: string) => `${n > 0 ? '+' : ''}${s}`;

/**
 * The change against the previous period, or null when there is none to show
 * (compare off, a "now" number, or no value). Counts change relatively with one
 * decimal ("+12.0%"), rates in points ("+3 pts"), small counts as a difference
 * ("+1"); a previous 0 also shows the difference. Its tone says whether the
 * move is good, so colour is never the only signal: the text has a sign.
 */
export function changeOf(m: Metric, kind: ChangeKind, upIsGood = true): Change | null {
  if (m.value === null || m.previous === null) return null;
  const diff = m.value - m.previous;
  let shown: number;
  let text: string;
  if (kind === 'rate') {
    shown = one(diff);
    text = signed(shown, `${trim(shown)} pts`);
  } else if (kind === 'abs' || m.previous === 0) {
    shown = Math.round(diff);
    text = signed(shown, formatCount(shown));
  } else {
    shown = one((diff / m.previous) * 100);
    text = signed(shown, `${shown.toFixed(1)}%`);
  }
  if (shown === 0) return { text: 'No change', tone: 'flat', icon: 'remove' };
  const up = shown > 0;
  return {
    text,
    tone: up === upIsGood ? 'good' : 'bad',
    icon: up ? 'arrow_upward' : 'arrow_downward',
  };
}

/** A rate as shown: "84%", "6.8%". */
export const formatRate = (n: number) => `${trim(n)}%`;

/** Hours to one decimal: "6.2 h". */
export const formatHours = (n: number) => `${n.toFixed(1)} h`;

/** A count; "—" when not known (PostHog down). */
export const formatMaybe = (n: number | null, f: (n: number) => string = formatCount) =>
  n === null ? '—' : f(n);

/** A share of a whole as a whole percent: 0 when the whole is 0. */
export const shareOf = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
