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
 * The mentor's first opening, relative to now and on the hour. Null only for a
 * mentor with nothing open. A "refreshing" mentor still has a grid — only the
 * card's summary of it is being recomputed (backend reply round 3 #13).
 */
function firstOpening(mentorId: string, now: number): number | null {
  if (mockAvailabilityState(mentorId) === 'none') return null;
  const i = MENTORS.findIndex((m) => m.id === mentorId);
  const offsetHours = mentorId === FEATURED.id ? 30 : i >= 0 ? 2 + ((i * 11) % 70) : null;
  if (offsetHours === null) return null;
  const at = new Date(now + offsetHours * HOUR);
  at.setUTCMinutes(0, 0, 0);
  return at.getTime();
}

/** The card's `next_available_at`: the first opening, unless it is being recomputed. */
export function mockNextAvailableAt(mentorId: string, now = Date.now()): string | null {
  if (mockAvailabilityState(mentorId) !== 'open') return null;
  const at = firstOpening(mentorId, now);
  return at === null ? null : new Date(at).toISOString();
}

export const MOCK_SESSION_TYPES: SessionTypeRead[] = [
  {
    id: 'st-general',
    name: 'General mentorship',
    description:
      'An open conversation about your study-abroad plans: schools, funding and next steps.',
    duration_minutes: 60,
    min_notice_minutes: 120,
    service_offering: null,
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
    service_offering: null,
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
  const first = firstOpening(mentorId, now);
  const type = MOCK_SESSION_TYPES.find((t) => t.id === sessionTypeId);
  if (first === null || !type) return [];
  const origin = first + (type.id === 'st-general' ? 0 : DAY);
  const out: { start: string; end: string }[] = [];
  for (let d = 0; origin + d * DAY < endExclusive; d += 2) {
    for (const h of [0, 1, 5]) {
      const start = origin + d * DAY + h * HOUR;
      if (start >= endExclusive) continue;
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
