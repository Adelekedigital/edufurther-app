/**
 * **PENDING BACKEND** — every onboarding call and shape the published spec
 * doesn't have yet (docs/handoff/onboarding-backend-request.md #1–6, PRD
 * Mentee Onboarding v5). One file on purpose: when the client is regenerated,
 * delete what shipped here and `tsc` lists every call site to move onto the
 * typed client. The phase A mock answers these shapes (respond.ts `pendingOk`).
 */

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

export type PendingResponses = {};
