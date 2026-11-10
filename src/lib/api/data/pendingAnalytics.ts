import type { components } from '@/lib/api/generated/schema';

type Schemas = components['schemas'];

/**
 * **PENDING BACKEND** (funnels, Behaviour): Admin Analytics (PRD 31) wire shapes, as proposed to
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

/** Shipped (backend #618). `by_stage` `not_set`: the session's type has no stage, or it has no type. */
export type WireGrowth = Schemas['AnalyticsGrowthRead'];
export type WireStageKey = WireGrowth['by_stage'][number]['key'];

/*
 * Funnels and Behaviour: copied field for field from the backend's
 * AnalyticsFunnelRead / AnalyticsBehaviourRead on its development branch
 * (24bb2ce, PR 633, frozen with edufurtherbe-24 on 10 Nov). Every rate is a
 * percentage or null (nothing to divide by); a step's `value` is null when
 * nothing tracks it.
 */
export type WireFunnel = Section & {
  name: 'signup' | 'booking' | 'mentee_activation' | 'mentor_activation' | 'mentor_application';
  /** The breakdown read; `all` when none was asked. */
  by: string;
  note: string;
  /** Days a person has from the first step to the last. */
  window_days: number;
  steps: { key: string; label: string; value: number | null; previous: number | null }[];
};

/** Where a profile view came from; anything else is counted as `other`. The words are ours. */
export type WireProfileViewSource =
  | 'explore'
  | 'home'
  | 'bookings'
  | 'messages'
  | 'similar_mentors'
  | 'invite_link'
  | 'direct'
  | 'other';

export type WireBehaviour = Section & {
  login: { attempts: number; failed_rate: number | null; failed_migrated_rate: number | null };
  search: { searches: number; no_result_rate: number | null; profile_views: number };
  /** Most first. */
  profile_views_by_source: { source: WireProfileViewSource; share: number | null }[];
  joining: { clicked: number; failed: number; median_minutes_before: number | null };
  writing_assist: { used: number; accepted_rate: number | null; discarded_rate: number | null };
  app: { installed: number; push_allowed_rate: number | null };
  /** Top 3 routes by failures. */
  errors_by_screen: { route: string; count: number }[];
  /** This environment's PostHog replays; null when it isn't set. */
  replays_url: string | null;
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
  'GET /api/v1/admin/analytics/funnels/{name}': WireFunnel;
  'GET /api/v1/admin/analytics/behaviour': WireBehaviour;
};
