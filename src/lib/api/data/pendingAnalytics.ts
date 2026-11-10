import type { components } from '@/lib/api/generated/schema';

type Schemas = components['schemas'];

/**
 * Admin Analytics (PRD 31) wire shapes: every one now aliases the published
 * schema (the last, funnels and Behaviour, with backend #633). The names stay so
 * the mappers in adminAnalytics.ts read one vocabulary.
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

/** Shipped (backend #633): the published schemas. Every rate is a percentage or null. */
export type WireFunnel = Schemas['AnalyticsFunnelRead'];
export type WireBehaviour = Schemas['AnalyticsBehaviourRead'];
/** Where a profile view came from; anything else is counted as `other`. The words are ours. */
export type WireProfileViewSource = WireBehaviour['profile_views_by_source'][number]['source'];

/** The section routes and what each returns. */
export type WireSections = {
  overview: WireOverview;
  sessions: WireSessions;
  supply: WireSupply;
  credits: WireCredits;
  growth: WireGrowth;
};

/** Nothing in Admin Analytics is pending any more. */
export type PendingAnalyticsResponses = Record<never, never>;
