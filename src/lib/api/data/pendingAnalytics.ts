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

/**
 * Pending: `active_members` on the overview (backend edufurtherbe-5e, shape
 * agreed 2026-11-12, released after the FE's "ready"). Optional, so the
 * overview reads it as `WireOverview & WireActiveMembersField`; once the spec
 * carries it, alias the schema here. The headline totals stay in `sub_tracks`.
 */
type WireRoleActive = { weekly: WireMetric; monthly: WireMetric; stickiness: WireMetric };
export type WireActiveMembers = {
  /** The first full day of recorded activity in this environment (YYYY-MM-DD); null before any. */
  history_from?: string | null;
  by_role?: { mentee: WireRoleActive; mentor: WireRoleActive } | null;
  /**
   * WAU per north_star point; null before the first full day of history.
   * `by_role` splits each point (mentee + mentor = value); not drawn yet, as
   * the design has no role filter.
   */
  series?:
    | {
        start: string;
        value: number | null;
        previous: number | null;
        by_role?: Record<
          'mentee' | 'mentor',
          { value: number | null; previous: number | null }
        > | null;
      }[]
    | null;
};
export type WireActiveMembersField = { active_members?: WireActiveMembers | null };

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

/**
 * Funnels v2 (backend decision 338, release handshake): each step's layer and
 * the figures beside the funnel. Optional here until the spec publishes them;
 * the intersection still type-checks once they're required.
 */
export type WireFunnelLayer = 'primary' | 'secondary';
export type WireFunnelFigure = {
  key: string;
  label: string;
  value: number | null;
  previous: number | null;
  unit: 'days' | 'percent';
};
export type WireFunnelV2 = Omit<WireFunnel, 'steps'> & {
  steps: (WireFunnel['steps'][number] & { layer?: WireFunnelLayer })[];
  figures?: WireFunnelFigure[];
};
export type WireBehaviour = Schemas['AnalyticsBehaviourRead'];
/** Where a profile view came from; anything else is counted as `other`. The words are ours. */
export type WireProfileViewSource = WireBehaviour['profile_views_by_source'][number]['source'];

/** The section routes and what each returns. */
export type WireSections = {
  overview: WireOverview & WireActiveMembersField;
  sessions: WireSessions;
  supply: WireSupply;
  credits: WireCredits;
  growth: WireGrowth;
};

/** Nothing in Admin Analytics is pending any more. */
export type PendingAnalyticsResponses = Record<never, never>;
