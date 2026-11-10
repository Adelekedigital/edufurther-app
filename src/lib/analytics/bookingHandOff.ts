import type { BookingStep, EntryPoint } from './events';

/**
 * A booking put down to sign in or finish setup (Google, a new account's
 * onboarding, "Finish setup") is paused, not abandoned (PRD 30). The open
 * flow registers its funnel state here; the page calls `handOffBooking()`
 * right before it leaves; the flow that reopens the same mentor's booking
 * resumes it: no second `booking_started`, no replayed steps, and the
 * original entry point on the events and the request.
 *
 * Kept for this tab (sessionStorage survives the trip to Google and back) and
 * for a while only. It holds ids and enums, never answers.
 */

export type BookingFunnel = {
  mentorId: string;
  entryPoint: EntryPoint;
  last: 'started' | BookingStep;
  done: BookingStep[];
};

/** Longer than a sign-up and onboarding take; an older pause is a new visit. */
export const HAND_OFF_TTL_MS = 2 * 60 * 60 * 1000;
const KEY = 'ef-booking-handoff';
const ENTRY_POINTS: readonly string[] = [
  'mentor_profile',
  'explore',
  'home',
  'onboarding_guest',
  'rebook_after_review',
] satisfies EntryPoint[];
const STEPS: readonly string[] = ['type', 'time', 'questions'] satisfies BookingStep[];

type Active = { funnel: () => BookingFunnel; setHandedOff: (on: boolean) => void };
let active: Active | null = null;

/** The open flow says who it is; the returned call forgets it. One booking modal is open at a time. */
export function registerBookingFlow(a: Active): () => void {
  active = a;
  return () => {
    if (active === a) active = null;
  };
}

/** The page is leaving with the booking (before its push or redirect). */
export function handOffBooking(): void {
  if (!active) return;
  active.setHandedOff(true);
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...active.funnel(), at: Date.now() }));
  } catch {
    // Storage off: the reopened booking counts as a new one.
  }
}

/** The hand-off didn't happen after all (Google couldn't start): the flow is open again. */
export function cancelHandOff(): void {
  active?.setHandedOff(false);
  clearHandOff();
}

/** The paused booking with this mentor, if one is waiting. Pure: safe in a state initialiser. */
export function peekHandOff(mentorId: string): BookingFunnel | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<BookingFunnel & { at: number }> | null;
    if (
      !d ||
      d.mentorId !== mentorId ||
      !ENTRY_POINTS.includes(d.entryPoint as string) ||
      typeof d.at !== 'number' ||
      Date.now() - d.at > HAND_OFF_TTL_MS
    )
      return null;
    const done = Array.isArray(d.done) ? d.done.filter((x) => STEPS.includes(x)) : [];
    const last = d.last && STEPS.includes(d.last) ? d.last : 'started';
    return { mentorId, entryPoint: d.entryPoint!, last, done };
  } catch {
    return null;
  }
}

/** Resumed (or given up): the pause is used once. */
export function clearHandOff(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
}
