/**
 * Pure helpers over the Bookings view model: no fetching, no React, no
 * generated types. Everything here is decided from a `Booking` and `now`, so
 * the same rule can be tested directly and used in a row, a hero or a panel.
 */
import { formatTime } from '@/lib/utils/format';
import type { Booking, BookingStatus, BookingParty } from '@/types/booking';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The six statuses that belong in History: everything that is over. */
/**
 * The History filters: three chips over six outcomes (owner, 2026-10-03).
 *
 * "Didn't happen" rather than "Canceled", because a request that was declined,
 * expired or withdrawn was never cancelled by anyone — filing it under that
 * word misdescribes it. Each row still tags its exact outcome, so nothing is
 * hidden by the grouping.
 *
 * Missed keeps its own chip for a reason the data supports: a session where at
 * least one person turned up is not the same as one nobody came to.
 */
export const HISTORY_FILTERS: { key: string; label: string; statuses: BookingStatus[] }[] = [
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  {
    key: 'didnt-happen',
    label: 'Didn’t happen',
    statuses: ['cancelled', 'declined', 'expired', 'withdrawn'],
  },
  { key: 'missed', label: 'Missed', statuses: ['noShow'] },
];

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
 * What the pending pill says, for whichever side is looking
 * (Bookings.dc.html, `waitingStyle=pill`).
 *
 * The mentor is told what to do and by when. The mentee cannot act at all, so
 * theirs names who it waits on — and once the deadline is close it says how
 * close, because "waiting" stops being useful when it is nearly too late.
 */
export function waitingPill(
  b: Booking,
  now = new Date(),
): { icon: 'timer' | 'hourglass_top'; text: string; urgent: boolean } | null {
  if (b.status !== 'pending' || isLapsed(b, now)) return null;
  const deadline = respondDeadline(b);
  const urgent = isRespondUrgent(deadline, now);
  const left = formatRespondIn(deadline, now);
  if (b.side === 'mentor') return { icon: 'timer', text: `Respond within ${left}`, urgent };
  return urgent
    ? { icon: 'timer', text: `${b.other.firstName} has ${left} left to confirm`, urgent: true }
    : { icon: 'hourglass_top', text: `Waiting for ${b.other.firstName} to confirm`, urgent: false };
}

/**
 * Where Join stands on Bookings, whose Join only opens the session's own page.
 * `none` is a session with no window at all: never agreed to, called off, or
 * an older row the backend never stamped.
 *
 * Open from `join_opens_at` until `join_closes_at` for someone who hasn't
 * joined (no late first arrivals, product 2026-10-08). For someone who has,
 * until the room closes (`door_closes_at`): they need the way back to the
 * page, which offers Rejoin (backend #380). A session settled while still
 * running keeps that door, so the status alone does not close it.
 */
export type JoinState = 'none' | 'before' | 'open' | 'closed';

export function joinState(b: Booking, now = new Date()): JoinState {
  const live = b.status === 'confirmed' || b.status === 'completed' || b.status === 'noShow';
  const closes = b.myJoinedAt
    ? (b.doorClosesAt ?? b.joinClosesAt)
    : b.status === 'confirmed'
      ? b.joinClosesAt
      : null;
  if (!live || !b.joinOpensAt || !closes) return 'none';
  const t = now.getTime();
  if (t < new Date(b.joinOpensAt).getTime()) return 'before';
  if (t >= new Date(closes).getTime()) return 'closed';
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

/**
 * The hero's when-pill: how far off the next session is, in the design's own
 * vocabulary (Bookings.dc.html `nextIn`), but computed rather than picked from
 * a tweak. Green and a filled dot once it is running — that is the one state
 * where the person should already be somewhere else.
 */
export function nextSessionWhen(
  b: Booking,
  now = new Date(),
  timeZone = 'UTC',
): { label: string; icon: 'event' | 'schedule' | 'radio_button_checked'; live: boolean } {
  const ms = new Date(b.startsAt).getTime() - now.getTime();
  if (ms <= 0) {
    const mins = Math.max(1, Math.round(-ms / MINUTE));
    return { label: `Started ${mins} min ago`, icon: 'radio_button_checked', live: true };
  }
  if (ms < HOUR)
    return {
      label: `Starts in ${Math.max(1, Math.round(ms / MINUTE))} min`,
      icon: 'schedule',
      live: false,
    };
  // Counted in calendar days in the viewer's zone, not in 24-hour blocks:
  // on Saturday afternoon, a Monday session is "In 2 days", never "Tomorrow".
  const days = daysBetween(now, new Date(b.startsAt), timeZone);
  if (days === 0)
    return {
      label: `Starts in ${Math.max(1, Math.round(ms / HOUR))} h`,
      icon: 'schedule',
      live: false,
    };
  if (days === 1) return { label: 'Tomorrow', icon: 'event', live: false };
  return { label: `In ${days} days`, icon: 'event', live: false };
}

/** Whole calendar days from `a` to `b`, counted in `zone`. */
function daysBetween(a: Date, b: Date, zone: string): number {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(d);
  const utc = (key: string) => Date.parse(`${key}T00:00:00Z`);
  return Math.round((utc(day(b)) - utc(day(a))) / (24 * HOUR));
}

/**
 * "Attendance rate: 92%" under the other person's name in the details panel,
 * or just what they are when there is no figure. Never "0%" from nothing: null
 * means no data, and a mentee with no history is not an unreliable one.
 */
export function attendanceLine(b: Booking): string {
  if (b.side !== 'mentor') return 'Mentor';
  if (b.menteeAttendanceRate == null) return 'Mentee';
  // The denominator, because a percentage without one says very little: 100%
  // of two sessions and 100% of forty are not the same claim (backend #409).
  // Guarded rather than assumed — a rate with no count is still a rate.
  const over = b.menteeAttendanceSessions;
  const count = over > 0 ? ` (${over} ${over === 1 ? 'session' : 'sessions'})` : '';
  return `Attendance rate: ${b.menteeAttendanceRate}%${count}`;
}

/**
 * "BSc Student at FUTA" — who this person is, in one line (backend #409).
 *
 * Both halves can be missing: there may be no education entry, or the account
 * may be deleted. Either alone still says something, so the line degrades
 * rather than disappearing, and an empty one renders nothing at all.
 *
 * **Our wording** — the design draws no such line. The contract spells that out
 * ("the wording is the client's"), so it is recorded as a divergence.
 */
export function partyLine(p: BookingParty): string {
  if (p.degree && p.institution) return `${p.degree} at ${p.institution}`;
  return p.degree ?? p.institution ?? '';
}

/**
 * The panel's own status line, which says more than the row's tag: a request
 * carries its deadline, and a confirmed session is named rather than left to
 * the tab it sits in.
 */
export function panelStatus(
  b: Booking,
  now = new Date(),
): { label: string; tone: StatusTone | 'info' } {
  if (b.status === 'pending') {
    // "Expired", like `statusTag`: the sweep has not run yet, but it is the
    // same state, and otherwise the user meets both words within an hour.
    if (isLapsed(b, now)) return { label: 'Expired', tone: 'warning' };
    // The same words as the row it was opened from, so the panel never tells a
    // mentee to "respond" to a request only their mentor can answer.
    const pill = waitingPill(b, now);
    return pill
      ? { label: pill.text, tone: pill.urgent ? 'warning' : 'info' }
      : { label: 'Expired', tone: 'warning' };
  }
  if (b.status === 'confirmed') return { label: 'Upcoming', tone: 'info' };
  const tag = statusTag(b.status);
  return tag ? { label: tag.label, tone: tag.tone } : { label: 'Upcoming', tone: 'info' };
}

export type StatusTone = 'success' | 'warning' | 'danger';

/**
 * What a past booking is called on screen, and in which tone.
 *
 * Design's table, 2026-10-03, with the owner's call on "Expired" over "Closed":
 * it matches the API's own status and says *why* nothing happened, where
 * "closed" would equally describe a cancellation or a withdrawal.
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
      return { label: 'Expired', tone: 'warning' };
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

/**
 * Whether Intl will accept this zone. Another account's profile field reaches
 * us here, and `Intl.DateTimeFormat` throws a RangeError on anything that is
 * not a real IANA name — which would take the whole row down over one line of
 * nice-to-have context.
 */
function isRenderableZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * A meeting link we are willing to send someone to. The join response is an
 * untyped object, and a `custom` venue is a mentor's own typed URL — someone
 * else's text on our page — so it gets the same check as a profile link
 * (lib/utils/socialUrl): https only, and no embedded credentials. Anything
 * else reads as "no venue", which is the truth from the viewer's side.
 */
export function safeMeetingUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
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
  if (!zone || zone === viewerZone || !isRenderableZone(zone)) return null;
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

/** Nobody may cancel once the session is this close (product, 2026-10-02). */
const CANCEL_LOCK_MIN = 10;
/** A mentee's cancellation refunds from here out. A mentor's always does. */
const MENTEE_REFUND_HOURS = 12;

function minutesUntil(b: Booking, now: Date): number {
  return (new Date(b.startsAt).getTime() - now.getTime()) / 60_000;
}

/** The mentor may take a request that is still waiting. */
export function canAccept(b: Booking, now = new Date()): boolean {
  return b.side === 'mentor' && b.status === 'pending' && !isLapsed(b, now);
}

/** The mentor may refuse a request that is still waiting. */
export function canDecline(b: Booking, now = new Date()): boolean {
  return b.side === 'mentor' && b.status === 'pending' && !isLapsed(b, now);
}

/** The mentee may take back a request the mentor has not answered. */
export function canWithdraw(b: Booking, now = new Date()): boolean {
  return b.side === 'mentee' && b.status === 'pending' && !isLapsed(b, now);
}

/**
 * Either side may call off a confirmed session, until it is nearly here.
 * The lock is the same for both: a cancellation ten minutes out reaches nobody
 * in time, so it is worse than turning up.
 */
export function canCancel(b: Booking, now = new Date()): boolean {
  return b.status === 'confirmed' && minutesUntil(b, now) > CANCEL_LOCK_MIN;
}

/**
 * Whether cancelling now returns the mentee's credit.
 *
 * A mentor's cancellation always does — the mentee did nothing wrong. A
 * mentee's does only with twelve hours' notice, which is the window the mentor
 * needs to fill the hour.
 */
export function refundOnCancel(b: Booking, now = new Date()): boolean {
  if (b.side === 'mentor') return true;
  return minutesUntil(b, now) >= MENTEE_REFUND_HOURS * 60;
}

/**
 * Did anybody turn up? Only meaningful once a session has settled as `noShow`.
 *
 * `pending` on a settled session is **not** absence: two migrated bookings have
 * no participant record at all. Those read as unknown, never as "nobody came".
 */
export function showedUp(b: Booking): boolean | null {
  const both = [b.other.attendance, b.myAttendance];
  if (both.some((a) => a === 'attended' || a === 'leftEarly')) return true;
  if (both.every((a) => a === 'noShow')) return false;
  return null;
}

/**
 * A confirmed session this request would run into, if accepted.
 *
 * The backend refuses an overlapping *booking* (`/problems/booking-overlap`),
 * but a mentor accepting a request is a different path: the design warns rather
 * than blocks, because accepting both may be exactly what they mean to do.
 * Saying so beforehand is the whole point — "Accepting books both".
 *
 * Touching edges do not overlap: a session ending at 3pm and one starting at
 * 3pm are back to back, which mentors do on purpose.
 */
export function overlapping(request: Booking, confirmed: Booking[]): Booking | null {
  const from = new Date(request.startsAt).getTime();
  const to = new Date(request.endsAt).getTime();
  return (
    confirmed.find((c) => {
      if (c.id === request.id || c.status !== 'confirmed') return false;
      return new Date(c.startsAt).getTime() < to && new Date(c.endsAt).getTime() > from;
    }) ?? null
  );
}
