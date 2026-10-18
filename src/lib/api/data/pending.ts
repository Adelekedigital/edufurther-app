/**
 * **PENDING BACKEND** — every onboarding call and shape the published spec
 * doesn't have yet (docs/handoff/onboarding-backend-request.md #1–6, PRD
 * Mentee Onboarding v5). One file on purpose: when the client is regenerated,
 * delete what shipped here and `tsc` lists every call site to move onto the
 * typed client. The phase A mock answers these shapes (respond.ts `pendingOk`).
 */
import { api } from './http';

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

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

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
  'POST /api/v1/me/writing-assist': WireAssist;
};
