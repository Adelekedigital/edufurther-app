/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: the onboarding completion's `409` body (the spec types it as empty),
 * and GET /mentor-schools (PRD Invite Landing, backend PR 1, in progress).
 */
import { api } from './http';

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

/**
 * GET /api/v1/mentor-schools?limit=: the top schools of bookable mentors, most
 * mentors first (the house Page envelope, ADR 0016; item `MentorSchoolRead`).
 */
export type WireMentorSchools = { data: { name: string }[]; next_cursor: string | null };

export type PendingResponses = {
  'GET /api/v1/mentor-schools': WireMentorSchools;
};

/** The generated client without its path types, for the calls above until they ship. */
export const untyped = api as unknown as Record<
  'GET',
  (path: string, init?: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;
