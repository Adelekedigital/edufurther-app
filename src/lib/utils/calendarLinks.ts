/**
 * "Add to calendar" for a booked session: a standard .ics file for any
 * calendar app, and links that open Google Calendar or Outlook.com with the
 * event filled in (product, 2026-10-08).
 *
 * The event points at the session's page on EduFurther, **never** at the call
 * link: that carries a personal access token, and a calendar is shared, synced
 * and forwarded.
 */

export type CalendarEvent = {
  /** The session id: a stable UID, so adding it twice updates rather than duplicates. */
  id: string;
  /** "1:1 call with Amara Okafor". */
  title: string;
  /** UTC instants. */
  startsAt: string;
  endsAt: string;
  /** Absolute URL of the session's page. */
  pageUrl: string;
  /** "EduFurther video"; null when the venue is unknown. */
  venue: string | null;
};

/** 2026-10-04T17:00:00Z → 20261004T170000Z (iCalendar and Google both want it). */
function compactUtc(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function description(e: CalendarEvent): string {
  return `Open your EduFurther session page to join: ${e.pageUrl}`;
}

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are escaped in text. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF and a space.
 * Counted in UTF-8 bytes, never splitting a character.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    // The first line holds 75 octets; continuations 74, after their leading space.
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** The .ics file's text. `now` is the DTSTAMP (injected in tests). */
export function icsFile(e: CalendarEvent, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EduFurther//Session//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@edufurther`,
    `DTSTAMP:${compactUtc(now.toISOString())}`,
    `DTSTART:${compactUtc(e.startsAt)}`,
    `DTEND:${compactUtc(e.endsAt)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(description(e))}`,
    ...(e.venue ? [`LOCATION:${escapeText(e.venue)}`] : []),
    `URL:${e.pageUrl}`,
    // A reminder 15 minutes before: the join window opens 5 minutes before.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT15M',
    `DESCRIPTION:${escapeText(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** "edufurther-session-2026-10-04.ics", the day in UTC. */
export function icsFilename(e: CalendarEvent): string {
  return `edufurther-session-${e.startsAt.slice(0, 10)}.ics`;
}

/** Google Calendar's "create event" page, filled in. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${compactUtc(e.startsAt)}/${compactUtc(e.endsAt)}`,
    details: description(e),
    ...(e.venue ? { location: e.venue } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Outlook.com's "new event" page, filled in. Work accounts use the .ics. */
export function outlookCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: new Date(e.startsAt).toISOString(),
    enddt: new Date(e.endsAt).toISOString(),
    body: description(e),
    ...(e.venue ? { location: e.venue } : {}),
  });
  return `https://outlook.live.com/calendar/0/action/compose?${q}`;
}

/**
 * Hands the browser the .ics as a download: no request, nothing leaves the
 * device. The object URL is released once the click has been dispatched.
 */
export function downloadIcs(e: CalendarEvent, now = new Date()): void {
  const blob = new Blob([icsFile(e, now)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = icsFilename(e);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
