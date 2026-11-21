/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: the onboarding completion's `409` body (the spec types it empty; the
 * codes are `components['schemas']['OnboardingRequirement']`), and Admin
 * Analytics (`pendingAnalytics.ts`), and `/me.seen_items` with
 * PUT /me/seen-items/{key} (seenItems.ts).
 */
import type { components } from '@/lib/api/generated/schema';
import { api } from './http';
import type { PendingAnalyticsResponses } from './pendingAnalytics';

/**
 * GET /me `seen_items` (required, never null, oldest first; agreed with the
 * backend, not in the published spec yet). Once it is, delete this and type
 * toViewer's argument as `UserRead` again (one line). Optional here so an
 * older /me still type-checks; absent, no tour shows.
 */
export type PendingMeRead = components['schemas']['UserRead'] & { seen_items?: string[] };

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

/** "METHOD path" → its success body, for each pending call. */
export type PendingResponses = PendingAnalyticsResponses;

/** The generated client without its path types, for the calls above only. */
export const untyped = api as unknown as Record<
  'GET' | 'PUT',
  (path: string, init?: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;
