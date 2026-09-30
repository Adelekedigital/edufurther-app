/**
 * MOCK availability, served by app/api/mock/… only when ENABLE_MOCK_API=1.
 *
 * One source for every mocked availability fact: the card's
 * `next_available_at` (/mentors, /featured-mentor), the offerings
 * (/users/{id}/session-types) and the bookable grid (/users/{id}/availability/slots).
 * The booking modal once had its own mock that started "tomorrow" for everyone,
 * so it contradicted the cards (failure-modes #24). Everything derives from
 * `mockNextAvailableAt` now, the way the backend derives it from one grid.
 */
import type { components } from '@/lib/api/generated/schema';
import { FEATURED, MENTORS } from './fixtures';

type SessionTypeRead = components['schemas']['SessionTypeRead'];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Null for the design's fully booked mentor and every seventh one ("refreshing"). */
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
  const offsetHours = mentorId === FEATURED.id ? 30 : i >= 0 ? 2 + ((i * 11) % 70) : null;
  return offsetHours === null ? null : EPOCH + offsetHours * HOUR;
}

/**
 * The card's `next_available_at`: the first slot still ahead on the earliest
 * offering (the grid the modal opens on), unless it is being recomputed.
 */
export function mockNextAvailableAt(mentorId: string, now = Date.now()): string | null {
  if (mockAvailabilityState(mentorId) !== 'open') return null;
  const first = mockSlots(mentorId, MOCK_SESSION_TYPES[0]!.id, now + 56 * DAY, now)[0];
  return first ? first.start : null;
}

// Fields the backend adds to SessionTypeRead as required: `service_offerings[]`
// (#9) and `questions[]` (backend PR #268, the live intake form). Spread from a
// variable so the mock compiles against the spec before and after each ships.
const NO_TOPICS = { service_offerings: [], questions: [], is_featured: false };

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
    booking_window_days: 56,
    service_offering: null,
    ...NO_TOPICS,
    application_stage: null,
    custom_stage_label: null,
    meeting_venue: 'google_meet',
  },
  {
    id: 'st-cv',
    name: 'CV review',
    description: 'We go through your CV line by line and fix what admissions teams skim past.',
    duration_minutes: 45,
    min_notice_minutes: 1440,
    booking_window_days: 56,
    service_offering: null,
    ...NO_TOPICS,
    // Every question kind the booking step renders (backend #268, #12, #282).
    questions: CV_QUESTIONS,
    application_stage: null,
    custom_stage_label: null,
    meeting_venue: 'google_meet',
  },
];

export function mockMentorExists(mentorId: string): boolean {
  return mentorId === FEATURED.id || MENTORS.some((m) => m.id === mentorId);
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
  if (first === null || !type) return [];
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
