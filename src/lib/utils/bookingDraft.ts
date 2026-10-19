import type { IntakeAnswer } from '@/types/mentor';
import { BOOKING_TOKEN, ISO_INSTANT } from './guestBooking';

/**
 * A booking put down to finish onboarding (BookingModal.dc.html round 4,
 * "Finish setup"): the mentor, session, time and answers, kept for this tab
 * only and per account, so the booking reopens filled in on the way back.
 * Answers can be personal: they live here, never in a URL or a log, and go
 * once the booking is sent. Nothing holds the time itself (owner, 2026-10-18).
 */
export type BookingDraft = {
  mentorId: string;
  /** The mentor's profile handle: where the booking reopens. */
  handle: string;
  sessionTypeId: string;
  /** UTC instant. */
  time: string;
  answers: Record<string, IntakeAnswer>;
  /** Onboarding is done: the next open of this booking says the credit was added. */
  finished?: boolean;
  savedAt: number;
};

/** Longer than any onboarding takes; an older draft is someone else's afternoon. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const PREFIX = 'ef-booking-draft:';
const keyFor = (userId: string) => `${PREFIX}${userId}`;

function isDraft(d: unknown): d is BookingDraft {
  const x = d as Partial<BookingDraft> | null;
  return (
    !!x &&
    typeof x.mentorId === 'string' &&
    typeof x.handle === 'string' &&
    BOOKING_TOKEN.test(x.handle) &&
    typeof x.sessionTypeId === 'string' &&
    BOOKING_TOKEN.test(x.sessionTypeId) &&
    typeof x.time === 'string' &&
    ISO_INSTANT.test(x.time) &&
    !Number.isNaN(Date.parse(x.time)) &&
    typeof x.savedAt === 'number' &&
    !!x.answers &&
    typeof x.answers === 'object'
  );
}

/** Only answers of the shapes we write: anything else in storage is dropped. */
function cleanAnswers(raw: Record<string, unknown>): Record<string, IntakeAnswer> {
  const out: Record<string, IntakeAnswer> = {};
  for (const [id, v] of Object.entries(raw)) {
    const a = v as IntakeAnswer | null;
    if (!a || typeof a !== 'object') continue;
    const kept: IntakeAnswer = {};
    if (typeof a.text === 'string') kept.text = a.text;
    if (Array.isArray(a.optionIds) && a.optionIds.every((o) => typeof o === 'string'))
      kept.optionIds = a.optionIds;
    const f = a.file;
    if (f && typeof f.id === 'string' && typeof f.name === 'string' && typeof f.size === 'number')
      kept.file = { id: f.id, name: f.name, size: f.size };
    if (Object.keys(kept).length) out[id] = kept;
  }
  return out;
}

/** A new draft starts its clock; a rewrite of one (`savedAt` given) keeps it. */
export function saveBookingDraft(
  userId: string,
  draft: Omit<BookingDraft, 'savedAt'> & { savedAt?: number },
): void {
  try {
    window.sessionStorage.setItem(
      keyFor(userId),
      JSON.stringify({ ...draft, savedAt: draft.savedAt ?? Date.now() }),
    );
  } catch {
    // Storage blocked (private mode): they come back to an empty booking, as before.
  }
}

export function readBookingDraft(userId: string): BookingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const d: unknown = JSON.parse(raw);
    if (!isDraft(d) || Date.now() - d.savedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(keyFor(userId));
      return null;
    }
    return { ...d, answers: cleanAnswers(d.answers as Record<string, unknown>) };
  } catch {
    return null;
  }
}

/** Onboarding finished for this mentor's booking: its next open shows the credit message once. */
export function markBookingDraftFinished(userId: string, handle: string): void {
  const d = readBookingDraft(userId);
  if (!d || d.handle !== handle) return;
  try {
    window.sessionStorage.setItem(keyFor(userId), JSON.stringify({ ...d, finished: true }));
  } catch {
    // Not remembered: the booking still reopens, without the message.
  }
}

export function clearBookingDraft(userId: string): void {
  try {
    window.sessionStorage.removeItem(keyFor(userId));
  } catch {
    // Nothing to clear.
  }
}

/** Signing out: no draft (its answers can be personal) outlives the session in this tab. */
export function clearAllBookingDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // Storage blocked: nothing was kept.
  }
}
