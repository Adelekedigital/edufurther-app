/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: nothing pending. The Messages names below are aliases of the
 * generated shapes (live since edufurtherbe PRs 560–567).
 */
import { api } from './http';
import type { components } from '@/lib/api/generated/schema';

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

export type PendingResponses = Record<never, never>;

/** The generated client without its path types: the Messages hooks, until they move to `api`. */
export const untyped = api as unknown as Record<
  'GET' | 'POST' | 'PATCH',
  (path: string, init?: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;

// ---- Messages ---------------------------------------------------------------
// Live since edufurtherbe PRs 560-567: these names are the generated shapes,
// kept so the data layer's imports don't move while the hooks switch to `api`.

type S = components['schemas'];

/** `PersonRead`: one person shape, shared with booking parties (backend reply). */
export type WireChatPerson = S['PersonRead'];
export type WireNextBooking = S['NextBookingRead'];
export type WireLast = S['LastRead'];
export type WireChatRow = S['ChatRead'];
export type WireChats = S['ChatPage'];
export type WireMessageFile = S['FileRead'];
export type WireMessage = S['MessageRead'];
export type WireThread = S['ThreadRead'];
export type WireMessageSettings = S['MessageSettingsRead'];
/** The intake upload shape (`IntakeFileRead`), reused for message files. */
export type WireUploadedFile = S['IntakeFileRead'];
