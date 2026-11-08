/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: only the onboarding completion's `409` body. The spec describes its
 * `missing` member in prose but still types the `409` content as empty; the
 * codes themselves are `components['schemas']['OnboardingRequirement']`.
 * Messages moved onto the typed client (its shapes live in `messages.ts`).
 */

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

export type PendingResponses = Record<never, never>;
