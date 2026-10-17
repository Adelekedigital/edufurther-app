/** Mentee onboarding and mentor matches (PRD: Mentee Onboarding v5, B4 / H8). */

import type { Mentor } from './mentor';

export type CountryRef = { id: string; label: string };

/**
 * Why a mentor fits, as structured codes (never server prose), so the wording
 * lives in one place on the frontend (lib/utils/matchReason.ts).
 */
export type MatchReason =
  | { code: 'study_country'; country: CountryRef }
  /** Sent only when the mentor's level is an exact match. */
  | { code: 'degree'; level: string }
  /** The picked help areas this mentor offers, as catalog slugs. */
  | { code: 'help_areas'; slugs: string[] }
  | { code: 'field'; field: string }
  | { code: 'origin'; country: CountryRef };

export type MentorMatch = {
  mentor: Mentor;
  reasons: MatchReason[];
  /** The mentor's own level and study country, for the no-reason fallback line. */
  level: string | null;
  studyCountry: string | null;
};

/** What the matches were ranked on, for the "Based on: …" line. */
export type MatchBasis = {
  /** As the mentee chose it ("MBA", not the stored Master's). */
  degree: string | null;
  field: string | null;
  /** Null for "Not sure yet". */
  country: string | null;
  origin: string | null;
};
