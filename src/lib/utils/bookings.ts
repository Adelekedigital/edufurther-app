/**
 * Pure helpers over the Bookings view model: no fetching, no React, no
 * generated types. Everything here is decided from a `Booking` and `now`, so
 * the same rule can be tested directly and used in a row, a hero or a panel.
 */
import { formatTime } from '@/lib/utils/format';
import type { Booking, BookingStatus, BookingTab } from '@/types/booking';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The six statuses that belong in History: everything that is over. */
export const HISTORY_STATUSES: BookingStatus[] = [
  'completed',
  'cancelled',
  'declined',
  'expired',
  'noShow',
  'withdrawn',
];

/**
 * When a request stops waiting. `respondBy` for anything booked since the
 * deadline shipped; older migrated requests carry none and lapse at their start
 * instead (backend reply §3).
 */
export function respondDeadline(b: Booking): string {
  return b.respondBy ?? b.startsAt;
}

/**
 * A request nobody answered in time. The backend's hourly sweep sets `expired`
 * up to an hour later, so for that hour the row still reads `pending` while
 * accept and decline already return 409 — the client has to decide this itself.
 */
export function isLapsed(b: Booking, now = new Date()): boolean {
  return b.status === 'pending' && new Date(respondDeadline(b)).getTime() <= now.getTime();
}

/** Which tab a booking belongs to. A lapsed request stays in Pending until the sweep moves it. */
export function tabOf(b: Booking): BookingTab {
  if (b.status === 'pending') return 'pending';
  if (b.status === 'confirmed') return 'upcoming';
  return 'history';
}

/**
 * "45 min" · "6h" · "3 days" — how long is left to answer (Bookings.dc.html).
 * Never says "0 min": under a minute still rounds up to one, because a request
 * that says zero reads as broken rather than urgent.
 */
export function formatRespondIn(deadlineIso: string, now = new Date()): string {
  const ms = new Date(deadlineIso).getTime() - now.getTime();
  const hours = Math.floor(ms / HOUR);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / MINUTE))} min`;
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)} days`;
}

/** Under a day left: the design's warm badge rather than the grey one. */
export function isRespondUrgent(deadlineIso: string, now = new Date()): boolean {
  return new Date(deadlineIso).getTime() - now.getTime() < 24 * HOUR;
}

/**
 * Where the join window sits. `none` is a session that has no window at all —
 * anything not confirmed, and older rows the backend never stamped.
 */
export type JoinState = 'none' | 'before' | 'open' | 'closed';

export function joinState(b: Booking, now = new Date()): JoinState {
  if (b.status !== 'confirmed' || !b.joinOpensAt || !b.joinClosesAt) return 'none';
  const t = now.getTime();
  if (t < new Date(b.joinOpensAt).getTime()) return 'before';
  if (t > new Date(b.joinClosesAt).getTime()) return 'closed';
  return 'open';
}

/**
 * How long before the start the door opens, in whole minutes — for the copy
 * that tells people to come back. Read from the session rather than hard-coded:
 * the design's "10 min" was wrong, and a number repeated in prose goes stale
 * the day the backend changes it.
 */
export function joinOpensInMinutes(b: Booking): number | null {
  if (!b.joinOpensAt) return null;
  const ms = new Date(b.startsAt).getTime() - new Date(b.joinOpensAt).getTime();
  return ms > 0 ? Math.round(ms / MINUTE) : null;
}

/** A session that has started but whose join window is still open. */
export function isInProgress(b: Booking, now = new Date()): boolean {
  return joinState(b, now) === 'open' && new Date(b.startsAt).getTime() <= now.getTime();
}

/**
 * The hero's when-pill: how far off the next session is, in the design's own
 * vocabulary (Bookings.dc.html `nextIn`), but computed rather than picked from
 * a tweak. Green and a filled dot once it is running — that is the one state
 * where the person should already be somewhere else.
 */
export function nextSessionWhen(
  b: Booking,
  now = new Date(),
): { label: string; icon: 'event' | 'schedule' | 'radio_button_checked'; live: boolean } {
  const ms = new Date(b.startsAt).getTime() - now.getTime();
  if (ms <= 0) {
    const mins = Math.max(1, Math.round(-ms / MINUTE));
    return { label: `Started ${mins} min ago`, icon: 'radio_button_checked', live: true };
  }
  if (ms < HOUR)
    return { label: `Starts in ${Math.max(1, Math.round(ms / MINUTE))} min`, icon: 'schedule', live: false };
  const days = Math.floor(ms / (24 * HOUR));
  if (days < 1)
    return { label: `Starts in ${Math.round(ms / HOUR)} h`, icon: 'schedule', live: false };
  if (days < 2) return { label: 'Tomorrow', icon: 'event', live: false };
  return { label: `In ${days} days`, icon: 'event', live: false };
}

export type StatusTone = 'success' | 'warning' | 'danger';

/**
 * What a past booking is called on screen, and in which tone.
 *
 * The design drew three outcomes; the API has six. `declined`, `expired` and
 * `withdrawn` are ours until design answers (docs/handoff/bookings-design-request.md) —
 * `expired` reads "Unconfirmed", which is the backend's own word for it.
 */
export function statusTag(status: BookingStatus): { label: string; tone: StatusTone } | null {
  switch (status) {
    case 'completed':
      return { label: 'Completed', tone: 'success' };
    case 'cancelled':
      return { label: 'Canceled', tone: 'warning' };
    case 'noShow':
      return { label: 'Missed', tone: 'danger' };
    case 'declined':
      return { label: 'Declined', tone: 'danger' };
    case 'expired':
      return { label: 'Unconfirmed', tone: 'warning' };
    case 'withdrawn':
      return { label: 'Withdrawn', tone: 'warning' };
    default:
      return null;
  }
}

/**
 * The row's heading: "School shortlist session with Amara Okafor". Without a
 * topic it drops to "Session with Amara Okafor" — the session type's name is
 * not on the API's session row, so there is nowhere else to look for it.
 */
export function bookingHeading(b: Booking): string {
  return b.title ? `${b.title} session with ${b.other.name}` : `Session with ${b.other.name}`;
}

/** "12:00 pm to 1:00 pm", in the viewer's zone. */
export function timeRange(b: Booking, timeZone: string): string {
  return `${formatTime(b.startsAt, timeZone)} to ${formatTime(b.endsAt, timeZone)}`;
}

/** A zone's city, as the line names it: "Africa/Port_Harcourt" → "Port Harcourt". */
function cityOf(zone: string): string {
  return (zone.split('/')[1] ?? '').replace(/_/g, ' ');
}

/** The hour of an instant in a given zone, 0–23. */
function hourIn(isoInstant: string, zone: string): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: zone }).format(
      new Date(isoInstant),
    ),
  );
}

/** The calendar date of an instant in a zone, for spotting a day that differs. */
function dayIn(isoInstant: string, zone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date(isoInstant));
}

/**
 * What time this is for the other person — "9:00 am to 10:00 am for Amara in
 * Lagos", with "· late for Amara" outside 7am–10pm, and their date in front
 * when it falls on a different day.
 *
 * This is the line that stops someone cheerfully confirming 2am for a stranger,
 * so it is worth the arithmetic. Null when their zone is unknown (a deleted
 * account) or the same as the viewer's, where it would only repeat the time
 * already on the row.
 */
export function otherTimeLine(
  b: Booking,
  viewerZone: string,
): { text: string; odd: boolean } | null {
  const zone = b.other.timeZone;
  if (!zone || zone === viewerZone) return null;
  const first = b.other.firstName;
  const city = cityOf(zone);
  const hour = hourIn(b.startsAt, zone);
  const odd = hour < 7 || hour >= 22;
  const shifted = dayIn(b.startsAt, zone) !== dayIn(b.startsAt, viewerZone);
  const date = shifted
    ? `${new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: zone,
      }).format(new Date(b.startsAt))} · `
    : '';
  const range = `${formatTime(b.startsAt, zone)} to ${formatTime(b.endsAt, zone)}`;
  const where = city ? ` in ${city}` : '';
  // Before 7am reads as early, after 10pm as late — the design's own split.
  const note = odd ? ` · ${hour >= 4 && hour < 7 ? 'early' : 'late'} for ${first}` : '';
  return { text: `${date}${range} for ${first}${where}${note}`, odd };
}

/**
 * "Sep 19, 2026" — the year included because History reaches back past it.
 *
 * Divergence: the design gives a past row only the weekday-and-number badge
 * ("SAT 19"), which says nothing about which July it was. History rows carry
 * the full date in their time line; Upcoming and Pending keep the design's
 * badge alone, since everything there is within weeks.
 */
export function fullDate(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(new Date(isoInstant));
}

/** "Attendance rate: 92%" under the mentee's name, or just "Mentee" with no data. */
export function attendanceLine(b: Booking): string {
  if (b.side !== 'mentor') return 'Mentor';
  return b.menteeAttendanceRate == null
    ? 'Mentee'
    : `Attendance rate: ${b.menteeAttendanceRate}%`;
}
