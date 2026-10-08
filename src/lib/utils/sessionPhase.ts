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
 * - `closed`: still running, but past `join_closes_at`, so nobody can get in
 *   (backend #379). Provisional.
 * - `settling`: over, but the attendance sweep (hourly) has not ruled yet. The
 *   backend's rule is never to infer "missed" from the clock, so this says it
 *   is being confirmed. Provisional.
 * - `elsewhere`: a status this page does not show (pending, cancelled, …). The
 *   page hands it to Bookings.
 */
export type SessionPhase =
  'upcoming' | 'soon' | 'ongoing' | 'closed' | 'settling' | 'completed' | 'missed' | 'elsewhere';

type Window = { opens: number; starts: number; closes: number; ends: number };

function windowOf(b: Booking): Window {
  const starts = new Date(b.startsAt).getTime();
  return {
    opens: b.joinOpensAt ? new Date(b.joinOpensAt).getTime() : starts - OPENS_BEFORE_MIN * MINUTE,
    starts,
    closes: b.joinClosesAt
      ? new Date(b.joinClosesAt).getTime()
      : starts + CLOSES_AFTER_MIN * MINUTE,
    ends: new Date(b.endsAt).getTime(),
  };
}

export function sessionPhase(b: Booking, now: Date): SessionPhase {
  if (b.status === 'completed') return 'completed';
  if (b.status === 'noShow') return 'missed';
  if (b.status !== 'confirmed') return 'elsewhere';
  const w = windowOf(b);
  const t = now.getTime();
  if (t < w.opens) return 'upcoming';
  if (t < w.starts) return 'soon';
  if (t < w.ends) return t <= w.closes ? 'ongoing' : 'closed';
  return 'settling';
}

/** Join is pressable: the window is open and the session is confirmed. */
export function canJoinNow(phase: SessionPhase): boolean {
  return phase === 'soon' || phase === 'ongoing';
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
      value: formatClock(w.starts - t),
      sub: opensIn > 0 ? `Join opens in ${formatClock(opensIn)}` : 'Join is open',
    };
  }
  if (phase === 'ongoing' || phase === 'closed') {
    const left = Math.max(0, Math.ceil((w.ends - t) / MINUTE));
    return { label: 'In session', value: formatClock(t - w.starts), sub: `${left} min left` };
  }
  return null;
}

/** The Join button's label when it cannot be pressed yet: "Join opens in 04:12". */
export function joinOpensLabel(b: Booking, now: Date): string {
  return `Join opens in ${formatClock(windowOf(b).opens - now.getTime())}`;
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
