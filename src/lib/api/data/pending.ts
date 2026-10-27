import type { components } from '@/lib/api/generated/schema';
import { api } from './http';

/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: the Admin PRD's reads and writes (edufurtherbe admin PRs 1–3, shapes
 * agreed in docs/handoff/admin-backend-request.md).
 */

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

export type PendingResponses = {
  'GET /api/v1/admin/mentors': { data: WireMentorRow[]; next_cursor: null };
  'GET /api/v1/admin/mentors/{user_id}': WireMentorDetail;
  'GET /api/v1/admin/mentors/{user_id}/notes': { data: WireAdminNote[] };
  'POST /api/v1/admin/mentors/{user_id}/notes': WireAdminNote;
  'POST /api/v1/admin/mentors/decisions': WireBulkDecision;
  'GET /api/v1/admin/mentees': { data: WireMenteeRow[] };
  'GET /api/v1/admin/mentees/{user_id}/credits': WireMenteeCredits;
  'GET /api/v1/admin/credit-log': { data: WireCreditEntry[]; next_cursor: string | null };
  'GET /api/v1/admin/credit-rules': WireCreditRules;
};

type Schemas = components['schemas'];

/** The generated client without its path types, for the calls below only. */
export const untyped = api as unknown as Record<
  'GET' | 'POST',
  (path: string, init?: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;

/** Admin PR 1 (A1): `/me` names the admin grant; `is_admin` is already typed. */
export type PendingMe = {
  admin_role?: 'super_admin' | 'mentor_approval' | 'limited_access' | null;
};

/** A person as the admin reads return them. */
export type WireAdminPerson = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  cover_color: string | null;
};

export type WireShowUpTier = 'on_track' | 'needs_attention' | 'at_risk';
export type WireMentorTab = 'applications' | 'approved' | 'paused' | 'not_approved';

/** A3 `GET /admin/mentors?tab=`: every field present, null where it doesn't apply. */
export type WireMentorRow = WireAdminPerson & {
  handle: string | null;
  email: string;
  submitted_at: string | null;
  approved_at: string | null;
  decided_at: string | null;
  paused_at: string | null;
  paused_by: 'admin' | 'mentor' | null;
  paused_reason: string | null;
  decline_reason: string | null;
  waiting_days: number | null;
  first_school: { name: string; country: string | null } | null;
  completed_sessions: number;
  upcoming_sessions: number;
  show_up_rate: number | null;
  show_up_tier: WireShowUpTier | null;
};

export type WireBookingOutcome =
  'upcoming' | 'completed' | 'missed_by_mentor' | 'missed_by_mentee' | 'canceled';

/** A4 `GET /admin/mentors/{user_id}`. */
export type WireMentorDetail = WireAdminPerson & {
  handle: string | null;
  email: string;
  status: 'application' | 'approved' | 'paused' | 'not_approved';
  submitted_at: string | null;
  approved_at: string | null;
  decided_at: string | null;
  linkedin_url: string | null;
  timezone: string | null;
  headline: string | null;
  about: string | null;
  education: Schemas['app__api__schemas__profile__EducationRead'][];
  help_areas: Schemas['ServiceOfferingRead'][];
  weekly_hours: Schemas['AvailabilityRuleRead'][];
  stats: {
    completed: number;
    upcoming: number;
    missed_by_mentor: number;
    show_up_rate: number | null;
    show_up_tier: WireShowUpTier | null;
  };
  recent_bookings: {
    id: string;
    mentee_first_name: string | null;
    mentee_last_name: string | null;
    starts_at: string;
    outcome: WireBookingOutcome;
  }[];
  paused: { at: string; by: 'admin' | 'mentor'; reason: string | null } | null;
  declined: { at: string; reason: string | null } | null;
};

/** A6 `GET|POST /admin/mentors/{user_id}/notes`. */
export type WireAdminNote = {
  id: string;
  body: string;
  created_at: string;
  author: WireAdminPerson;
};

/** A7 `POST /admin/mentors/decisions`. */
export type WireBulkDecision = { approved: string[]; failed: string[] };

/** A9 `GET /admin/mentees?q=`: mentees only, with the same credits as `/me`. */
export type WireMenteeRow = WireAdminPerson & {
  email: string;
  credits: Schemas['CreditsRead'] | null;
};

export type WireCreditKind =
  | 'booking'
  | 'refund'
  | 'monthly_free'
  | 'profile_completed'
  | 'admin_grant'
  | 'referral_unlock'
  | 'opening_balance'
  | 'expired';

/** A10/A11: one change to a mentee's credits, with the balance after it. */
export type WireCreditEntry = {
  id: string;
  at: string;
  change: number;
  balance_after: number;
  kind: WireCreditKind;
  refund_reason: 'mentor_canceled' | 'mentee_canceled' | 'mentor_no_show' | null;
  mentor: { first_name: string | null; last_name: string | null } | null;
  mentee: { user_id: string; first_name: string | null; last_name: string | null };
  admin: { first_name: string | null; last_name: string | null } | null;
  note: string | null;
};

/** A10 `GET /admin/mentees/{user_id}/credits`. */
export type WireMenteeCredits = { mentee: WireMenteeRow; history: WireCreditEntry[] };

export type WireCreditLogType = 'all' | 'admin' | 'bookings' | 'refunds' | 'monthly';

/** A12 `GET /admin/credit-rules`. */
export type WireCreditRules = { starter: number; monthly: number };
