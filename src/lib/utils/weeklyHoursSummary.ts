import { DAY_NAMES, timeLabel, type DayHours } from './sessionTypeDraft';

/** Monday first, as people read a week (backend days are Sunday = 0). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const short = (day: number) => DAY_NAMES[day]!.slice(0, 3);

/** [1,2,3,4,5] → "Mon–Fri"; [1,3] → "Mon, Wed"; runs of three or more become a range. */
function daysLabel(days: number[]): string {
  const idx = days.map((d) => WEEK_ORDER.indexOf(d)).sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1] === idx[j]! + 1) j++;
    const from = short(WEEK_ORDER[idx[i]!]!);
    const to = short(WEEK_ORDER[idx[j]!]!);
    if (j - i >= 2) parts.push(`${from}–${to}`);
    else for (let k = i; k <= j; k++) parts.push(short(WEEK_ORDER[idx[k]!]!));
    i = j + 1;
  }
  return parts.join(', ');
}

/**
 * The approved screen's hours line (Approved.dc.html "Mon–Fri, 6:00 pm –
 * 9:00 pm"): days that share the same times are grouped, groups split by "; ".
 * Null when no day is on.
 */
export function weeklyHoursSummary(days: readonly DayHours[]): string | null {
  const groups = new Map<string, { days: number[]; times: string }>();
  days.forEach((d, day) => {
    if (!d.on || d.slots.length === 0) return;
    const times = d.slots.map(([a, b]) => `${timeLabel(a)} – ${timeLabel(b)}`).join(', ');
    const g = groups.get(times) ?? { days: [], times };
    g.days.push(day);
    groups.set(times, g);
  });
  if (groups.size === 0) return null;
  // In week order of each group's first day.
  return [...groups.values()]
    .sort(
      (a, b) =>
        Math.min(...a.days.map((d) => WEEK_ORDER.indexOf(d))) -
        Math.min(...b.days.map((d) => WEEK_ORDER.indexOf(d))),
    )
    .map((g) => `${daysLabel(g.days)}, ${g.times}`)
    .join('; ');
}
