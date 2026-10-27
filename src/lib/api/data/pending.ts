/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: nothing pending. The Admin PRD's reads all shipped in the generated
 * client (edufurtherbe admin PRs 1–3).
 */

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

export type PendingResponses = Record<never, never>;
