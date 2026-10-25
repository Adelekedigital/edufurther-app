/**
 * MOCK availability, served by app/api/mock/… only when ENABLE_MOCK_API=1.
 *
 * One source for every mocked availability fact: the card's
 * `next_available_at` (/mentors, /featured-mentor), the offerings
 * (/users/{id}/session-types) and the bookable grid (/users/{id}/availability/slots).
 * The booking modal once had its own mock that started "tomorrow" for everyone,
 * so it contradicted the cards (failure-modes #24). Everything derives from
 * one grid now, as the backend's: each session type's own next time
 * (`mockTypeNextAvailable`), and the mentor's `mockNextAvailableAt` as the
 * earliest of them (backend #526).
 */
import type { components } from '@/lib/api/generated/schema';
import { DEFAULT_WINDOW_DAYS, MAX_WINDOW_DAYS } from './bookingPrefs';
import { FEATURED, MENTORS } from './fixtures';

type SessionTypeRead = components['schemas']['SessionTypeRead'];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Null for the design's fully booked mentor and every seventh one ("refreshing"). */
/** The mock viewer when the page is read as a mentor (viewer.ts MOCK_VIEWERS). */
const MOCK_MENTOR_VIEWER = 'mock-mentor';

export function mockAvailabilityState(mentorId: string): 'open' | 'none' | 'refreshing' {
  if (mentorId === 'm-jesuah') return 'none';
  const i = MENTORS.findIndex((m) => m.id === mentorId);
  return i >= 0 && i % 7 === 6 ? 'refreshing' : 'open';
}

/**
 * The grid is laid out from a fixed point — the hour this module loaded — not
 * from "now" on every request. Otherwise every slot moved an hour forward each
 * time the clock crossed one, and a time loaded at 10:59 was refused at 11:00
 * (review of #19). Slots that have passed simply drop off.
 */
const EPOCH = (() => {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d.getTime();
})();

/**
 * Where the mentor's grid starts. Null only for a mentor with nothing open. A
 * "refreshing" mentor still has a grid — only the card's summary of it is being
 * recomputed (backend reply round 3 #13).
 */
function gridOrigin(mentorId: string): number | null {
  if (mockAvailabilityState(mentorId) === 'none') return null;
  const i = MENTORS.findIndex((m) => m.id === mentorId);
  // The mock viewer-as-mentor gets a grid too. Resolving them in
  // `mockMentorExists` was only half of it: without an origin here they exist
  // with no open times, so the cancel dialog's picker renders "You have no open
  // times" and the one state worth reviewing — times to choose from — is still
  // unreachable in the mock and in CI.
  const offsetHours =
    mentorId === MOCK_MENTOR_VIEWER
      ? 6
      : mentorId === FEATURED.id
        ? 30
        : i >= 0
          ? 2 + ((i * 11) % 70)
          : null;
  return offsetHours === null ? null : EPOCH + offsetHours * HOUR;
}

/**
 * The card's `next_available_at`: the earliest of its offerings' times (backend
 * #526), unless it is being recomputed.
 */
export function mockNextAvailableAt(mentorId: string, now = Date.now()): string | null {
  if (mockAvailabilityState(mentorId) !== 'open') return null;
  const times = MOCK_SESSION_TYPES.flatMap(
    (t) => mockTypeNextAvailable(mentorId, t.id, now).next_available_at ?? [],
  );
  return times.sort()[0] ?? null;
}

type TypeState = 'open' | 'none' | 'refreshing';

/**
 * One offering's state (backend #526). A mentor's own none or refreshing holds
 * for every offering; for an open mentor the second offering varies by mentor
 * (open, none, refreshing in turn), so each card state has data to render.
 */
function mockTypeState(mentorId: string, typeId: string): TypeState {
  const mentor = mockAvailabilityState(mentorId);
  if (mentor !== 'open' || typeId === MOCK_SESSION_TYPES[0]!.id) return mentor;
  const i = MENTORS.findIndex((m) => m.id === mentorId);
  return i % 3 === 1 ? 'none' : i % 3 === 2 ? 'refreshing' : 'open';
}

/** One offering's `next_available_at` / `next_available_state`: its first slot in its window. */
export function mockTypeNextAvailable(
  mentorId: string,
  typeId: string,
  now = Date.now(),
): { next_available_at: string | null; next_available_state: TypeState } {
  const state = mockTypeState(mentorId, typeId);
  const type = MOCK_SESSION_TYPES.find((t) => t.id === typeId);
  if (state !== 'open' || !type) return { next_available_at: null, next_available_state: state };
  const first = mockSlots(mentorId, typeId, now + type.booking_window_days * DAY, now)[0];
  return first
    ? { next_available_at: first.start, next_available_state: 'open' }
    : { next_available_at: null, next_available_state: 'none' };
}

/**
 * The mentor's offerings as /users/{id}/session-types and the profile send
 * them, each with its own next time. Not taking bookings: none for every one.
 */
export function mockSessionTypesFor(mentorId: string, now = Date.now()): SessionTypeRead[] {
  const notTaking = [FEATURED, ...MENTORS].some(
    (m) => m.id === mentorId && m.taking_bookings === false,
  );
  return MOCK_SESSION_TYPES.map((t) => ({
    ...t,
    ...(notTaking
      ? { next_available_at: null, next_available_state: 'none' as const }
      : mockTypeNextAvailable(mentorId, t.id, now)),
  }));
}

// Fields the backend adds to SessionTypeRead as required: `service_offerings[]`
// (#9) and `questions[]` (backend PR #268, the live intake form). Spread from a
// variable so the mock compiles against the spec before and after each ships.
const NO_TOPICS = { service_offerings: [], questions: [], is_featured: false };
// Backend #526: each type's own next free time, required on SessionTypeRead.
// The spec's defaults (not computed yet) until mockSessionTypesFor fills them in.
const NOT_REFRESHED = { next_available_at: null, next_available_state: 'refreshing' as const };

const q = (
  id: string,
  display_order: number,
  question_text: string,
  question_type: 'free_text' | 'file_upload' | 'multi_choice',
  is_required: boolean,
  options: string[] = [],
  allows_multiple = false,
) => ({
  id,
  display_order,
  question_text,
  question_type,
  is_required,
  allows_multiple,
  options: options.map((text, i) => ({ id: `${id}-o${i + 1}`, text })),
});
export const CV_QUESTIONS = [
  q('00000000-0000-4000-8000-00000000c001', 0, 'Upload your current CV', 'file_upload', true),
  q('00000000-0000-4000-8000-00000000c002', 1, 'What is the CV for?', 'multi_choice', true, [
    'Masters application',
    'PhD application',
    'Job search',
  ]),
  q(
    '00000000-0000-4000-8000-00000000c003',
    2,
    'Which parts worry you most?',
    'multi_choice',
    false,
    ['Structure', 'Wording', 'Length', 'Gaps'],
    true,
  ),
  q('00000000-0000-4000-8000-00000000c004', 3, 'Anything else I should know?', 'free_text', false),
];

export const MOCK_SESSION_TYPES: SessionTypeRead[] = [
  {
    id: 'st-general',
    name: 'General mentorship',
    description:
      'An open conversation about your study-abroad plans: schools, funding and next steps.',
    duration_minutes: 60,
    min_notice_minutes: 120,
    // Its own two weeks (booking modal: two pages).
    booking_window_days: Math.min(14, MAX_WINDOW_DAYS),
    requires_booking_confirmation: true,
    ...NO_TOPICS,
    ...NOT_REFRESHED,
    is_starter: false,
    meeting_venue: 'google_meet',
  },
  {
    id: 'st-cv',
    name: 'CV review',
    description: 'We go through your CV line by line and fix what admissions teams skim past.',
    duration_minutes: 45,
    min_notice_minutes: 1440,
    // The platform's window (booking modal: up to eight pages).
    booking_window_days: DEFAULT_WINDOW_DAYS,
    requires_booking_confirmation: true,
    ...NO_TOPICS,
    ...NOT_REFRESHED,
    // Every question kind the booking step renders (backend #268, #12, #282).
    questions: CV_QUESTIONS,
    is_starter: false,
    meeting_venue: 'google_meet',
  },
];

/**
 * `mock-mentor` is the mock **viewer** when the page is read as a mentor
 * (`NEXT_PUBLIC_MOCK_VIEWER=mentor`, or `?mockViewer=mentor`), and it is not in
 * the discovery list — nobody books themselves. It still has to resolve here,
 * because a mentor offering another time in the cancel dialog reads their *own*
 * open slots. Without it that panel never leaves its skeleton, so the picker
 * could not be reviewed in the mock or by CI's page review.
 */

export function mockMentorExists(mentorId: string): boolean {
  return (
    mentorId === MOCK_MENTOR_VIEWER ||
    mentorId === FEATURED.id ||
    MENTORS.some((m) => m.id === mentorId)
  );
}

/**
 * The grid for one offering, up to `endExclusive`. The first offering opens at
 * the mentor's next-available instant (so the modal's first time equals the
 * card's); the second opens a day later, so switching offerings visibly
 * changes the grid. A few times a day, every other day.
 */
export function mockSlots(
  mentorId: string,
  sessionTypeId: string,
  endExclusive: number,
  now = Date.now(),
): { start: string; end: string }[] {
  const first = gridOrigin(mentorId);
  const type = MOCK_SESSION_TYPES.find((t) => t.id === sessionTypeId);
  // An offering with nothing free has no grid either, so its card and the
  // booking modal agree.
  if (first === null || !type || mockTypeState(mentorId, sessionTypeId) === 'none') return [];
  const origin = first + (type.id === 'st-general' ? 0 : DAY);
  const out: { start: string; end: string }[] = [];
  for (let d = 0; origin + d * DAY < endExclusive; d += 2) {
    for (const h of [0, 1, 5]) {
      const start = origin + d * DAY + h * HOUR;
      if (start < now || start >= endExclusive) continue;
      out.push({
        start: new Date(start).toISOString().replace('.000Z', 'Z'),
        end: new Date(start + type.duration_minutes * 60 * 1000)
          .toISOString()
          .replace('.000Z', 'Z'),
      });
    }
  }
  return out;
}
