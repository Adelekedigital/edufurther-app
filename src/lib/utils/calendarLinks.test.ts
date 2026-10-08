import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadIcs,
  googleCalendarUrl,
  icsFile,
  icsFilename,
  outlookCalendarUrl,
  type CalendarEvent,
} from './calendarLinks';

const event: CalendarEvent = {
  id: 's1',
  title: '1:1 call with Amara Okafor',
  startsAt: '2026-10-04T17:00:00Z',
  endsAt: '2026-10-04T17:30:00Z',
  pageUrl: 'https://app.test/sessions/s1',
  venue: 'EduFurther video',
};
const NOW = new Date('2026-10-01T09:00:00Z');

describe('icsFile', () => {
  const ics = icsFile(event, NOW);

  it('is one event with UTC times, a stable id and CRLF line ends', () => {
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n');
    expect(ics).toContain('UID:s1@edufurther\r\n');
    expect(ics).toContain('DTSTAMP:20261001T090000Z\r\n');
    expect(ics).toContain('DTSTART:20261004T170000Z\r\n');
    expect(ics).toContain('DTEND:20261004T173000Z\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
  });

  it('points at the session page, never at a call link', () => {
    expect(ics).toContain('URL:https://app.test/sessions/s1\r\n');
    expect(ics).not.toMatch(/meet|daily|room/i);
  });

  it('escapes text the format reserves', () => {
    const tricky = icsFile({ ...event, title: 'Visa; essays, and\\more\nnotes' }, NOW);
    expect(tricky).toContain('SUMMARY:Visa\\; essays\\, and\\\\more\\nnotes\r\n');
  });

  it('folds long lines at 75 octets without splitting a character', () => {
    const long = icsFile({ ...event, title: `Call with ${'Ọlá '.repeat(40)}` }, NOW);
    for (const line of long.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Unfolding restores the text exactly.
    expect(long.replace(/\r\n /g, '')).toContain(`SUMMARY:Call with ${'Ọlá '.repeat(40)}`);
  });

  it('reminds 15 minutes before, and leaves the venue out when unknown', () => {
    expect(ics).toContain('TRIGGER:-PT15M\r\n');
    expect(ics).toContain('LOCATION:EduFurther video\r\n');
    expect(icsFile({ ...event, venue: null }, NOW)).not.toContain('LOCATION:');
  });

  it('names the file by the session’s day', () => {
    expect(icsFilename(event)).toBe('edufurther-session-2026-10-04.ics');
  });
});

describe('web calendar links', () => {
  it('fills in Google Calendar', () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('1:1 call with Amara Okafor');
    expect(url.searchParams.get('dates')).toBe('20261004T170000Z/20261004T173000Z');
    expect(url.searchParams.get('details')).toContain('https://app.test/sessions/s1');
  });

  it('fills in Outlook.com', () => {
    const url = new URL(outlookCalendarUrl(event));
    expect(url.origin).toBe('https://outlook.live.com');
    expect(url.searchParams.get('subject')).toBe('1:1 call with Amara Okafor');
    expect(url.searchParams.get('startdt')).toBe('2026-10-04T17:00:00.000Z');
    expect(url.searchParams.get('enddt')).toBe('2026-10-04T17:30:00.000Z');
    expect(url.searchParams.get('body')).toContain('https://app.test/sessions/s1');
  });
});

describe('downloadIcs', () => {
  // jsdom has no object URLs: stub them, and put back whatever was there.
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(URL, { createObjectURL: original.create, revokeObjectURL: original.revoke });
  });

  it('downloads the file from memory and releases it', async () => {
    const create = vi.fn(() => 'blob:ics');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadIcs(event, NOW);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('edufurther-session-2026-10-04.ics');
    expect(anchor.href).toBe('blob:ics');
    expect(anchor.isConnected).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(revoke).toHaveBeenCalledWith('blob:ics');
  });
});
