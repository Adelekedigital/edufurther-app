/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: the onboarding completion's `409` body (the spec types it empty; the
 * codes are `components['schemas']['OnboardingRequirement']`), and Admin
 * Analytics (`pendingAnalytics.ts`).
 */
import type { PendingAnalyticsResponses } from './pendingAnalytics';

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

/** "METHOD path" → its success body, for each pending call. */
export type PendingResponses = PendingAnalyticsResponses;
