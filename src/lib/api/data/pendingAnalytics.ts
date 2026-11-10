import type { components } from '@/lib/api/generated/schema';

type Schemas = components['schemas'];

/**
 * **PENDING BACKEND** (Growth, funnels, Behaviour): Admin Analytics (PRD 31) wire shapes, as proposed to
 * edufurtherbe-24 on 9 Nov (docs/handoff/admin-analytics-backend-request.md).
 * Kept apart from pending.ts so the Emails move onto the typed client doesn't
 * touch these. When a route ships, delete its shape here and `tsc` lists the
 * call sites to move onto the generated client.
 */

/** A number and the same measure over the previous period (null: compare off, or a "now" number). */
export type WireMetric = Schemas['MetricRead'];

/** Shipped (backend #609): the published schema. */
export type WireAnalyticsWindow = Schemas['WindowRead'];

export type WireAnalyticsAlert = Schemas['AlertRead'];
export type WireAlertKey = WireAnalyticsAlert['key'];

type Section = { window: WireAnalyticsWindow; alerts: WireAnalyticsAlert[] };

/** Shipped (backend #614): the published schemas from here to Supply. */
export type WireOverview = Schemas['AnalyticsOverviewRead'];
export type WireFeatureKey = WireOverview['features'][number]['key'];

/** Acceptance, median reply and request expiry count decisions on requests only (a moved session going back for approval is not a second one). */
export type WireSessions = Schemas['AnalyticsSessionsRead'];
export type WireNoShowReason = NonNullable<WireSessions['top_no_show_reason']>['reason'];

export type WireSupply = Schemas['AnalyticsSupplyRead'];

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

export type WireFunnel = {
  steps: { key: string; label: string; value: number; previous: number | null }[];
};

export type WireBehaviour = {
  login: { attempts: number; failed_rate: number; failed_migrated_rate: number };
  search: { searches: number; no_result_rate: number; profile_views: number };
  profile_views_by_source: { source: string; label: string; share: number }[];
  joining: { clicked: number; failed: number; median_minutes_before: number | null };
  writing_assist: { used: number; accepted_rate: number; discarded_rate: number };
  app: { installed: number; push_allowed_rate: number };
  errors_by_screen: { route: string; count: number }[];
  replays_url: string;
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
  'GET /api/v1/admin/analytics/growth': WireGrowth;
  'GET /api/v1/admin/analytics/funnels/{name}': WireFunnel;
  'GET /api/v1/admin/analytics/behaviour': WireBehaviour;
};
