/**
 * **PENDING BACKEND** — every onboarding call and shape the published spec
 * doesn't have yet (docs/handoff/onboarding-backend-request.md #1–6, PRD
 * Mentee Onboarding v5). One file on purpose: when the client is regenerated,
 * delete what shipped here and `tsc` lists every call site to move onto the
 * typed client. The phase A mock answers these shapes (respond.ts `pendingOk`).
 */
import type { components } from '@/lib/api/generated/schema';
import { api } from './http';

type Ref = { id: string; label: string };

/** The generated client without its path types, for the calls above only. */
export const untyped = api as unknown as {
  GET: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  PUT: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  POST: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
};

/**
 * `/me` `onboarding` with `last_step` (requested 2026-10-17; GET /me/onboarding
 * has it but answers 404 to anyone who never started). Absent until it ships.
 */
export type PendingOnboardingStatus = NonNullable<
  components['schemas']['UserRead']['onboarding']
> & {
  last_step?: 'help' | 'plans' | null;
};

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

/** #4 `GET /me/mentor-matches` (PRD B4, rev 93). */
export type WireReason =
  | { code: 'study_country'; country: Ref }
  | { code: 'degree'; level: Ref }
  | { code: 'help_areas'; offering_ids: string[] }
  | { code: 'field'; field: string }
  | { code: 'origin'; country: Ref };

export type WireMatches = {
  matches: {
    mentor: components['schemas']['MentorSummaryRead'];
    reasons: WireReason[];
    level?: string | null;
    study_country?: string | null;
  }[];
  exact: boolean;
  based_on: {
    degree: (Ref & { raw?: string | null }) | null;
    field: string | null;
    country: Ref | null;
    origin: Ref | null;
  } | null;
  /** Guest path: false when the picked mentor can't be booked any more. */
  for_mentor_bookable?: boolean;
};

/** #7 `POST /me/writing-assist` (PRD B7): never saves. */
export type AssistField = 'mentor_about' | 'mentee_bio';
export type WireAssistRequest = { field: AssistField; mode: 'draft' | 'improve'; text?: string };
export type WireAssist = { text: string; prompt_version: string };

/** #8: the About's provenance, read with the profile and sent with its PATCH. */
export type PendingAboutRead = { about_me_drafted_at?: string | null };
export type PendingAboutWrite = {
  about_me_drafted?: boolean;
  about_me_prompt_version?: string | null;
};

/** What the mock may answer for an operation the spec lacks, by "METHOD path" (respond.ts `pendingOk`). */
export type PendingResponses = {
  'GET /api/v1/me/mentor-matches': WireMatches;
  'POST /api/v1/me/writing-assist': WireAssist;
};
