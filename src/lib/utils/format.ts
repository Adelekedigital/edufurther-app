/** Formatting shared by several levels. Pure; no components, no data. */

export function sessionsLabel(n: number): string {
  if (n === 0) return 'No sessions yet';
  if (n === 1) return '1 session';
  return `${n} sessions`;
}

/** "4.9" — one decimal, the scale the backend documents as X/5. */
export function formatRating(r: number): string {
  return r.toFixed(1);
}

/**
 * A calendar date (YYYY-MM-DD, already in the viewer's zone — see
 * utils/slots.ts) as "Mon" / "Sep 28". Formatted in UTC on purpose: the date is
 * not an instant, and reading it in a zone would move it a day for anyone east
 * of UTC+12.
 */
/** "Oct 12", in the viewer's zone: a deletion date, said the same on the row, the confirm and the announcement. */
export function formatShortDate(isoInstant: string): string {
  return new Date(isoInstant).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDay(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...o, timeZone: 'UTC' }).format(d);
  return { weekday: fmt({ weekday: 'short' }), date: fmt({ month: 'short', day: 'numeric' }) };
}

export function formatTime(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
    .format(new Date(isoInstant))
    .replace('AM', 'am')
    .replace('PM', 'pm');
}

/** "Today, 12:00 pm" · "Tomorrow, 4:00 pm" · "Tue, Sep 29, 12:00 pm" — in the viewer's zone. */
export function formatNextAvailable(
  isoInstant: string,
  timeZone: string,
  now = new Date(),
): string {
  const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);
  const at = new Date(isoInstant);
  const time = formatTime(isoInstant, timeZone);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (dayKey(at) === dayKey(now)) return `Today, ${time}`;
  if (dayKey(at) === dayKey(tomorrow)) return `Tomorrow, ${time}`;
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(at);
  return `${day}, ${time}`;
}

/**
 * Mentor Profile.dc.html "Similar mentors": "Free today" · "Free tomorrow" ·
 * "Free Thu" (within the week) · "Free Oct 9", in the viewer's zone. Every
 * session is free until paid sessions ship (product rule, 2026-09-27).
 */
export function formatFreeDay(isoInstant: string, timeZone: string, now = new Date()): string {
  // Calendar days apart in the viewer's zone (not 24h steps: DST days are 23
  // or 25 hours, and 9:59 vs 10:00 on the same day must read alike).
  // Read the parts, not a locale's layout (en-CA's YYYY-MM-DD is CLDR data,
  // not a guarantee).
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const dayNumber = (d: Date) => {
    const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, Number(x.value)]));
    return Date.UTC(p.year!, p.month! - 1, p.day!) / 86_400_000;
  };
  const at = new Date(isoInstant);
  const days = dayNumber(at) - dayNumber(now);
  // A time already past (a stale value, a tab left open) reads as today,
  // never as next week's day of the same name.
  if (days <= 0) return 'Free today';
  if (days === 1) return 'Free tomorrow';
  const day = new Intl.DateTimeFormat(
    'en-US',
    days <= 6 ? { weekday: 'short', timeZone } : { month: 'short', day: 'numeric', timeZone },
  ).format(at);
  return `Free ${day}`;
}

/**
 * A label as it reads mid-sentence: "Visa and interview" → "visa and
 * interview", but "CV review" and "SOP drafts" keep their capitals.
 */
export function inSentence(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label[0]!.toLowerCase() + label.slice(1) : label;
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * A country as it reads after "to": "the United Kingdom", "Canada". The same
 * rule as MentorCard.dc.html / Mentor Profile.dc.html.
 */
export function countryInSentence(country: string): string {
  return /^(United |UK$|UAE$|Netherlands|Philippines|Czech Republic|Bahamas|Gambia)/.test(country)
    ? `the ${country}`
    : country;
}

/** The move line's pair, when both ends are known and differ; else null. */
export function movedBetween(
  origin: string | null | undefined,
  study: string | null | undefined,
): { from: string; to: string } | null {
  return origin && study && origin !== study
    ? { from: origin, to: countryInSentence(study) }
    : null;
}
