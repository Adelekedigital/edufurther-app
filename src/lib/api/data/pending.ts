/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: the onboarding completion's `409` body (the spec types it empty; the
 * codes are `components['schemas']['OnboardingRequirement']`), and Admin
 * Emails (PRD 28, edufurtherbe-59 PRs 1–3, routes due 11 Nov; shapes settled
 * with that session on 9 Nov).
 */
import { api } from './http';

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

export type PendingResponses = {
  'GET /api/v1/admin/emails': { data: WireEmailSummary[]; next_cursor: null };
  'GET /api/v1/admin/email-values': { data: WireEmailValue[] };
  'GET /api/v1/admin/emails/{key}': WireEmailDetail;
  'PUT /api/v1/admin/emails/{key}/variants/{variant}': WireEmailDetail;
};

/** The generated client without its path types, for the calls above only. */
export const untyped = api as unknown as Record<
  'GET' | 'PUT',
  (path: string, init?: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;

// ---- Admin Emails (PRD 28) ---------------------------------------------------

export type WireEmailRecipient = 'mentor' | 'mentee' | 'admins';

/** One registry email, in registry order; a group's emails sit together. */
export type WireEmailSummary = {
  /** The outbox `event_type`, e.g. `session_booked`; `sign_in_code` too. */
  key: string;
  name: string;
  trigger: string;
  /** TEMPLATE_GROUPS key; an email with its own template is a group of one (its key). */
  group: string;
  group_name: string;
  template_name: string;
  recipients: WireEmailRecipient[];
  status: 'live' | 'not_set_up';
  /** The newest `email_line_edits` row, or null: default wording. */
  last_edited: { admin_name: string; at: string } | null;
};

/** The values catalogue: what a `{name}` in a line means and falls back to. */
export type WireEmailValue = {
  name: string;
  meaning: string;
  example: string;
  /** Null for `code`: an empty code stops the send. */
  fallback: string | null;
  /** Email names, in registry order. */
  used_in: string[];
};

export type WireLineKey = 'subject' | 'heading' | 'button';

/** One editable line of one variant. `version` 0: no override (the default sends). */
export type WireEmailLine = {
  default_text: string;
  /** What sends now: the override, else the default. */
  text: string;
  edited: boolean;
  version: number;
  /** The code default moved since this line was edited. */
  default_changed: boolean;
  new_default: string | null;
};

export type WireEmailVariant = {
  /** `default`, `mentor`, `mentee`, `admins`, or a case (`one_message`…). */
  id: string;
  label: string;
  /** Value name → sample value, for the preview and the as-sent count. */
  sample: Record<string, string>;
  sample_recipient: { name: string; email: string };
  lines: Partial<Record<WireLineKey, WireEmailLine>>;
};

/** GET /admin/emails/{key}, and what a save returns. */
export type WireEmailDetail = WireEmailSummary & {
  /** How many other emails share its template. */
  siblings: number;
  values: Omit<WireEmailValue, 'used_in'>[];
  variants: WireEmailVariant[];
};

/** PUT /admin/emails/{key}/variants/{variant}. */
export type WireEmailSave = {
  lines: Partial<Record<WireLineKey, { text: string; version: number }>>;
  keep_edit?: WireLineKey[];
};

/** 409 /problems/email-line-conflict: who saved first. */
export type WireEmailConflict = { updated_by_name: string; updated_at: string };

/** 422 /problems/email-line-invalid. */
export type WireEmailLineError = {
  line: WireLineKey;
  code: 'empty' | 'unknown_value' | 'value_not_sent' | 'too_long';
  value?: string;
  suggestion?: string;
};
