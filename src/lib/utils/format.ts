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

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
