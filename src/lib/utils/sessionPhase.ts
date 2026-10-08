import type { Booking } from '@/types/booking';
import { formatTime } from './format';

const MINUTE = 60_000;
/** The backend's window, used only for an older row it never stamped. */
const OPENS_BEFORE_MIN = 5;
const CLOSES_AFTER_MIN = 15;

/**
 * Where a session stands, for the join page (Session Join.dc.html).
 *
 * The design's five states plus three it does not draw:
 * - `closed`: still running, but past `join_closes_at`: no first arrivals any
 *   more. Someone who has joined can still get back in until `door_closes_at`
 *   (see `entryFor`).
 * - `settling`: over, but the attendance sweep (hourly) has not ruled yet. The
 *   backend's rule is never to infer "missed" from the clock, so this says it
 *   is being confirmed. Provisional.
 * - `elsewhere`: a status this page does not show (pending, cancelled, …). The
 *   page hands it to Bookings.
 */
export type SessionPhase =
  'upcoming' | 'soon' | 'ongoing' | 'closed' | 'settling' | 'completed' | 'missed' | 'elsewhere';

type Window = { opens: number; starts: number; closes: number; ends: number; door: number };

function windowOf(b: Booking): Window {
  const starts = new Date(b.startsAt).getTime();
  return {
    opens: b.joinOpensAt ? new Date(b.joinOpensAt).getTime() : starts - OPENS_BEFORE_MIN * MINUTE,
    starts,
    closes: b.joinClosesAt
      ? new Date(b.joinClosesAt).getTime()
      : starts + CLOSES_AFTER_MIN * MINUTE,
    ends: new Date(b.endsAt).getTime(),
    // The room closes with the session; the backend publishes the instant.
    door: new Date(b.doorClosesAt ?? b.endsAt).getTime(),
  };
}

/**
 * The clock decides while the session runs, whatever the status: the backend
 * can settle it as `completed` or `no_show` while people are still in the
 * call (backend #380), and the page must not send them away mid-session.
 */
export function sessionPhase(b: Booking, now: Date): SessionPhase {
  if (b.status !== 'confirmed' && b.status !== 'completed' && b.status !== 'noShow')
    return 'elsewhere';
  const w = windowOf(b);
  const t = now.getTime();
  if (t >= w.ends)
    return b.status === 'completed' ? 'completed' : b.status === 'noShow' ? 'missed' : 'settling';
  if (t < w.opens) return 'upcoming';
  if (t < w.starts) return 'soon';
  return t <= w.closes ? 'ongoing' : 'closed';
}

/**
 * How this person gets into the call now:
 * - `join`: their first arrival (`POST /join`, the attendance record), while
 *   the join window is open;
 * - `door`: back in after they have joined (`POST /door`, records nothing),
 *   until `door_closes_at`;
 * - null: no way in. Before the window, or a first arrival after it closed
 *   (product, 2026-10-08: late first-timers are not let in).
 *
 * `join_closes_at` and `door_closes_at` are compared as instants, never by an
 * assumed order: the backend publishes both, and their relation has changed
 * once already (backend #388).
 */
export function entryFor(
  b: Booking,
  meJoinedAt: string | null,
  phase: SessionPhase,
  now: Date,
): 'join' | 'door' | null {
  if (phase !== 'soon' && phase !== 'ongoing' && phase !== 'closed') return null;
  const w = windowOf(b);
  const t = now.getTime();
  if (meJoinedAt) return t < w.door ? 'door' : null;
  return phase === 'closed' ? null : 'join';
}

/** The phase will not change again on its own: no clock, no polling. */
export function isFinal(phase: SessionPhase): boolean {
  return phase === 'completed' || phase === 'missed' || phase === 'elsewhere';
}

/** The design's clock: "1:45:00" over an hour, "08:00" under. Never negative. */
export function formatClock(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const DAY_MS = 24 * 3_600_000;

/**
 * How long until something: the clock under a day, hours under two, whole days beyond.
 * Ours: the design only draws waits under two hours, and "73:59:59" reads as
 * a malfunction rather than three days.
 */
export function formatWait(ms: number): string {
  if (ms < DAY_MS) return formatClock(ms);
  // Whole days round down, so under two days "1 day" could mean 47 hours.
  if (ms < 2 * DAY_MS) return `${Math.floor(ms / 3_600_000)} hours`;
  return `${Math.floor(ms / DAY_MS)} days`;
}

/** How many minutes before the start the door opens, read from the row (5 today). */
export function opensBeforeMin(b: Booking): number {
  const w = windowOf(b);
  return Math.round((w.starts - w.opens) / MINUTE);
}

export type LobbyClock = {
  /** "Starts in" / "In session". */
  label: string;
  value: string;
  /** "Join opens in 04:12" / "Join is open" / "18 min left". */
  sub: string;
};

/** The hero's clock, or null where the phase has none. */
export function lobbyClock(b: Booking, phase: SessionPhase, now: Date): LobbyClock | null {
  const w = windowOf(b);
  const t = now.getTime();
  if (phase === 'upcoming' || phase === 'soon') {
    const opensIn = w.opens - t;
    return {
      label: 'Starts in',
      value: formatWait(w.starts - t),
      sub:
        opensIn <= 0
          ? 'Join is open'
          : opensIn < DAY_MS
            ? `Join opens in ${formatClock(opensIn)}`
            : // Days out, a second countdown says nothing the first doesn't.
              `Join opens ${opensBeforeMin(b)} minutes before the start`,
    };
  }
  // No clock once it has started (product, 2026-10-08): the call may run on
  // another platform, and a timer here would disagree with it.
  return null;
}

/** The locked Join button's label: "Join opens in 04:12"; plain "Join session" when days away. */
export function joinOpensLabel(b: Booking, now: Date): string {
  const ms = windowOf(b).opens - now.getTime();
  return ms < DAY_MS ? `Join opens in ${formatClock(ms)}` : 'Join session';
}

/** "Mon, Sep 28". */
export function lobbyDate(isoInstant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(isoInstant));
}

/** "6:00 – 6:30 pm", or "11:30 am – 12:00 pm" when the half of the day changes. */
export function lobbyTimes(b: Booking, timeZone: string): string {
  const start = formatTime(b.startsAt, timeZone);
  const end = formatTime(b.endsAt, timeZone);
  const half = (s: string) => s.slice(-2);
  return half(start) === half(end) ? `${start.slice(0, -3)} – ${end}` : `${start} – ${end}`;
}

/** What the session's video is called. Null provider: an older row with no venue. */
export function providerName(provider: string | null): string | null {
  switch (provider) {
    case 'daily':
      return 'EduFurther video';
    case 'google_meet':
      return 'Google Meet';
    case 'zoom':
      return 'Zoom';
    case 'custom':
      return 'Video call';
    default:
      return null;
  }
}

/**
 * The design's Join label and the hint under it, per venue. A `custom` venue is
 * a mentor's own link (any service), so it gets neutral words; the design
 * draws only the three named ones.
 */
export function providerJoin(provider: string | null): { join: string; hint: string } {
  switch (provider) {
    case 'google_meet':
      return { join: 'Join on Google Meet', hint: 'Opens Google Meet in a new tab.' };
    case 'zoom':
      return { join: 'Join on Zoom', hint: 'Opens the Zoom app or browser.' };
    case 'custom':
      return { join: 'Join session', hint: 'Opens the meeting link in a new tab.' };
    default:
      return { join: 'Join session', hint: 'Opens in your browser. No download needed.' };
  }
}
