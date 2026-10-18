/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: the mentor application status (Mentor Onboarding PRD B2/B3, contract
 * verified against edufurtherbe @ addefbd; backend building it).
 */
import type { components } from '@/lib/api/generated/schema';
import { api } from './http';

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

/** The generated client without its path types, for the calls below only. */
export const untyped = api as unknown as {
  GET: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  POST: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  PATCH: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
};

/** B2: MentorProfileRead (owner only) gains these; the review pair only while declined. */
export type PendingMentorProfile = components['schemas']['MentorProfileRead'] & {
  submitted_at?: string | null;
  approved_seen_at?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
};

/** `GET /me` with the B2 mentor profile fields. */
export type PendingMe = Omit<components['schemas']['UserRead'], 'mentor_profile'> & {
  mentor_profile?: PendingMentorProfile | null;
};

/** B3: sets approved_seen_at once (idempotent; 409 unless approved). */
export const APPROVED_SEEN_PATH = '/api/v1/me/mentor-application/approved-seen';

/** B3: PATCH /users/{id}/profile gains `primary_role` ("Continue as a mentee", decision #17). */
export type PendingProfileRole = { primary_role: 'mentee' | 'mentor' };

export type PendingResponses = {
  'POST /api/v1/me/mentor-application/approved-seen': { approved_seen_at: string };
  /** B2 submit (mentor onboarding, PR 4). */
  'POST /api/v1/me/mentor-application/submit': {
    submitted_at: string;
    approval_status: 'pending' | 'approved' | 'declined';
  };
};
