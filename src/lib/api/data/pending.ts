/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: the mentor application's B3 writes (Mentor Onboarding PRD; B2's /me
 * fields shipped in edufurtherbe #492 and are on the typed client).
 */
import { api } from './http';

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

/** The generated client without its path types, for the calls below only. */
export const untyped = api as unknown as {
  POST: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  PATCH: (
    path: string,
    init?: unknown,
  ) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
};

/** B3: sets approved_seen_at once, keeping the first (200 {approved_seen_at}; 409 unless approved). */
export const APPROVED_SEEN_PATH = '/api/v1/me/mentor-application/approved-seen';

/** B3: PATCH /users/{id}/profile gains `primary_role` ("Continue as a mentee", decision #17). */
export type PendingProfileRole = { primary_role: 'mentee' | 'mentor' };

export type PendingResponses = {
  'POST /api/v1/me/mentor-application/approved-seen': { approved_seen_at: string };
};
