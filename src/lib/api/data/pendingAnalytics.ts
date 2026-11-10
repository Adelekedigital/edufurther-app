import type { components } from '@/lib/api/generated/schema';

type Schemas = components['schemas'];

/**
 * **PENDING BACKEND**: Admin Analytics (PRD 31) wire shapes, as proposed to
 * edufurtherbe-24 on 9 Nov (docs/handoff/admin-analytics-backend-request.md).
 * Kept apart from pending.ts so the Emails move onto the typed client doesn't
 * touch these. When a route ships, delete its shape here and `tsc` lists the
 * call sites to move onto the generated client.
 */

/** A number and the same measure over the previous period (null: compare off, or a "now" number). */
export type WireMetric = { value: number | null; previous: number | null };

/** Shipped (backend #609): the published schema. */
export type WireAnalyticsWindow = Schemas['WindowRead'];

export type WireAnalyticsAlert = Schemas['AlertRead'];
export type WireAlertKey = WireAnalyticsAlert['key'];

type Section = { window: WireAnalyticsWindow; alerts: WireAnalyticsAlert[] };

export type WireFeatureKey =
  | 'booking'
  | 'explore'
  | 'messaging'
  | 'mentor_supply'
  | 'invites'
  | 'mentee_activation'
  | 'mentor_activation';

export type WireOverview = Section & {
  north_star: {
    completed: WireMetric;
    unit: 'day' | 'week';
    /** `start` opens each bucket: a day, or 7 days counted from the window's first day (the last may be shorter). */
    series: { start: string; value: number; previous: number | null }[];
  };
  sub_tracks: {
    unique_mentees: WireMetric;
    mentors_delivered: WireMetric;
    sessions_per_mentee: WireMetric;
  };
  features: {
    key: WireFeatureKey;
    value: WireMetric | null;
    spark: number[] | null;
    contribution: number | null;
  }[];
};

export type WireNoShowReason = 'forgot' | 'technical' | 'emergency' | 'wrong_time_zone' | 'other';

export type WireSessions = Section & {
  kpis: {
    requests: WireMetric;
    acceptance_rate: WireMetric;
    median_reply_hours: WireMetric;
    show_up_rate: WireMetric;
    repeat_booking_rate: WireMetric;
    average_rating: WireMetric;
    review_rate: WireMetric;
    reports: WireMetric;
  };
  outcomes: {
    requests: number;
    completed: number;
    cancelled: number;
    expired: number;
    no_show: number;
    declined: number;
  };
  /** The most given no-show reason; the copy is ours (`NO_SHOW_REASON`). */
  top_no_show_reason: { reason: WireNoShowReason; share: number } | null;
  guardrails: {
    no_show_rate: WireMetric;
    request_expiry_rate: WireMetric;
    credit_expiry_rate: WireMetric;
  };
};

export type WirePlaceRow = { key: string; name: string; mentees: number; bookable_mentors: number };

export type WireSupply = Section & {
  cohort: { applied: number; approved: number; listed: number; bookable: number };
  median_review_days: number | null;
  unlisted: number;
  by_country: WirePlaceRow[];
  by_school: WirePlaceRow[];
};

/**
 * Shipped (backend #609). Since backend decision 308 there are no starter or
 * referral grants: a finished onboarding or a qualifying invite is a `level_up`.
 */
export type WireCredits = Schemas['AnalyticsCreditsRead'];
export type WireCreditSource = WireCredits['by_source'][number]['source'];

export type WireStageKey =
  | 'exploring'
  | 'researching'
  | 'preparing_documents'
  | 'applying'
  | 'interview_prep'
  | 'awaiting_decision'
  | 'not_set';

export type WireGrowth = Section & {
  signups: { all: WireMetric; mentees: WireMetric; mentors: WireMetric };
  /** Empty until PRD 30 records the sign-up source and channel. */
  by_source: { key: string; members: number; completed_share: number }[];
  by_channel: { key: string; members: number; completed_share: number }[];
  invites: {
    invited: number;
    joined: number;
    qualified: number;
    first_booking: number;
    first_completed: number;
    /** Null while no credit is tied to a referral (decision 308). */
    cost_per_completed: number | null;
    top_inviter: { name: string; joined: number } | null;
  };
  months: { month: string; count: number }[];
  /** `on` is null: no cutover date is recorded. */
  migrated: { count: number; on: string | null } | null;
  completed_total: number;
  by_topic: { key: string; name: string; count: number }[];
  by_stage: { key: WireStageKey; count: number }[];
};

/** The section routes and what each returns. */
export type WireSections = {
  overview: WireOverview;
  sessions: WireSessions;
  supply: WireSupply;
  credits: WireCredits;
  growth: WireGrowth;
};

export type PendingAnalyticsResponses = {
  'GET /api/v1/admin/analytics/overview': WireOverview;
  'GET /api/v1/admin/analytics/sessions': WireSessions;
  'GET /api/v1/admin/analytics/supply': WireSupply;
  'GET /api/v1/admin/analytics/growth': WireGrowth;
};
