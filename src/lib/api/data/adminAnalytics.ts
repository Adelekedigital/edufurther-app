'use client';

import { useQuery } from '@tanstack/react-query';
import { windowKey, windowParams, type AnalyticsWindow, type Metric } from '@/lib/utils/analytics';
import { apiError, retryOnce } from './errors';
import { keys } from './keys';
import { api } from './http';
import { untyped } from './pending';
import type {
  WireAlertKey,
  WireAnalyticsAlert,
  WireCreditSource,
  WireCredits,
  WireFeatureKey,
  WireGrowth,
  WireNoShowReason,
  WireOverview,
  WireSections,
  WireSessions,
  WireStageKey,
  WireSupply,
} from './pendingAnalytics';

// Admin Analytics (PRD 31). PENDING BACKEND: the calls go through `untyped`
// until the routes are in the published spec (edufurtherbe-24, PRs 1 to 5).

export type AnalyticsTab = 'overview' | 'sessions' | 'supply' | 'credits' | 'growth' | 'funnels';
export type FunnelName =
  'signup' | 'booking' | 'mentee_activation' | 'mentor_activation' | 'mentor_application';

/** A PRD 30 alert, newest first; `link` opens the view that explains it. */
export type AnalyticsAlert = {
  key: WireAlertKey;
  title: string;
  body: string;
  link: { tab: AnalyticsTab; funnel?: FunnelName; by?: string } | null;
};

export type AnalyticsHead = { from: string; to: string; alerts: AnalyticsAlert[] };

const TABS: readonly string[] = ['overview', 'sessions', 'supply', 'credits', 'growth', 'funnels'];
const FUNNELS: readonly string[] = [
  'signup',
  'booking',
  'mentee_activation',
  'mentor_activation',
  'mentor_application',
];
export const isAnalyticsTab = (s: string | null): s is AnalyticsTab => !!s && TABS.includes(s);
export const isFunnelName = (s: string | null): s is FunnelName => !!s && FUNNELS.includes(s);

/** An alert whose link names a view we don't have keeps its words and drops the link. */
const toAlert = (a: WireAnalyticsAlert): AnalyticsAlert => ({
  key: a.key,
  title: a.title,
  body: a.body,
  link:
    a.link && isAnalyticsTab(a.link.tab)
      ? {
          tab: a.link.tab,
          ...(isFunnelName(a.link.funnel ?? null) ? { funnel: a.link.funnel as FunnelName } : {}),
          ...(a.link.by ? { by: a.link.by } : {}),
        }
      : null,
});

/** Newest first (PRD 31: one banner per alert). */
const toHead = (w: { window: { from: string; to: string }; alerts: WireAnalyticsAlert[] }) => ({
  from: w.window.from,
  to: w.window.to,
  alerts: [...w.alerts].sort((a, b) => b.raised_at.localeCompare(a.raised_at)).map(toAlert),
});

// ---- Sections ---------------------------------------------------------------

export type Overview = AnalyticsHead & {
  northStar: {
    completed: Metric;
    unit: 'day' | 'week';
    series: { start: string; value: number; previous: number | null }[];
  };
  subTracks: { uniqueMentees: Metric; mentorsDelivered: Metric; sessionsPerMentee: Metric };
  features: {
    key: WireFeatureKey;
    /** Null: its source isn't answering (PostHog). */
    value: Metric | null;
    spark: number[] | null;
    contribution: number | null;
  }[];
};

export const toOverview = (w: WireOverview): Overview => ({
  ...toHead(w),
  northStar: w.north_star,
  subTracks: {
    uniqueMentees: w.sub_tracks.unique_mentees,
    mentorsDelivered: w.sub_tracks.mentors_delivered,
    sessionsPerMentee: w.sub_tracks.sessions_per_mentee,
  },
  features: w.features,
});

export type Sessions = AnalyticsHead & {
  kpis: {
    requests: Metric;
    acceptanceRate: Metric;
    medianReplyHours: Metric;
    showUpRate: Metric;
    repeatBookingRate: Metric;
    averageRating: Metric;
    reviewRate: Metric;
    reports: Metric;
  };
  outcomes: {
    requests: number;
    completed: number;
    cancelled: number;
    expired: number;
    noShow: number;
    declined: number;
  };
  topNoShowReason: { reason: WireNoShowReason; share: number } | null;
  guardrails: { noShowRate: Metric; requestExpiryRate: Metric; creditExpiryRate: Metric };
};

export const toSessions = (w: WireSessions): Sessions => ({
  ...toHead(w),
  kpis: {
    requests: w.kpis.requests,
    acceptanceRate: w.kpis.acceptance_rate,
    medianReplyHours: w.kpis.median_reply_hours,
    showUpRate: w.kpis.show_up_rate,
    repeatBookingRate: w.kpis.repeat_booking_rate,
    averageRating: w.kpis.average_rating,
    reviewRate: w.kpis.review_rate,
    reports: w.kpis.reports,
  },
  outcomes: {
    requests: w.outcomes.requests,
    completed: w.outcomes.completed,
    cancelled: w.outcomes.cancelled,
    expired: w.outcomes.expired,
    noShow: w.outcomes.no_show,
    declined: w.outcomes.declined,
  },
  topNoShowReason: w.top_no_show_reason,
  guardrails: {
    noShowRate: w.guardrails.no_show_rate,
    requestExpiryRate: w.guardrails.request_expiry_rate,
    creditExpiryRate: w.guardrails.credit_expiry_rate,
  },
});

export type PlaceRow = { key: string; name: string; mentees: number; bookableMentors: number };

export type Supply = AnalyticsHead & {
  cohort: WireSupply['cohort'];
  medianReviewDays: number | null;
  unlisted: number;
  byCountry: PlaceRow[];
  bySchool: PlaceRow[];
};

const toPlace = (r: WireSupply['by_country'][number]): PlaceRow => ({
  key: r.key,
  name: r.name,
  mentees: r.mentees,
  bookableMentors: r.bookable_mentors,
});

export const toSupply = (w: WireSupply): Supply => ({
  ...toHead(w),
  cohort: w.cohort,
  medianReviewDays: w.median_review_days,
  unlisted: w.unlisted,
  byCountry: w.by_country.map(toPlace),
  bySchool: w.by_school.map(toPlace),
});

export type CreditSource = WireCreditSource;
export type Credits = AnalyticsHead & {
  flow: WireCredits['flow'];
  bySource: WireCredits['by_source'];
};

export const toCredits = (w: WireCredits): Credits => ({
  ...toHead(w),
  flow: w.flow,
  bySource: w.by_source,
});

export type StageKey = WireStageKey;
export type SplitRow = { key: string; members: number; completedShare: number };

export type Growth = AnalyticsHead & {
  signups: { all: Metric; mentees: Metric; mentors: Metric };
  bySource: SplitRow[];
  byChannel: SplitRow[];
  invites: {
    invited: number;
    joined: number;
    qualified: number;
    firstBooking: number;
    firstCompleted: number;
    costPerCompleted: number | null;
    topInviter: { name: string; joined: number } | null;
  };
  months: { month: string; count: number }[];
  migrated: { count: number; on: string | null } | null;
  completedTotal: number;
  byTopic: { key: string; name: string; count: number }[];
  byStage: { key: StageKey; count: number }[];
};

const toSplit = (r: WireGrowth['by_source'][number]): SplitRow => ({
  key: r.key,
  members: r.members,
  completedShare: r.completed_share,
});

export const toGrowth = (w: WireGrowth): Growth => ({
  ...toHead(w),
  signups: w.signups,
  bySource: w.by_source.map(toSplit),
  byChannel: w.by_channel.map(toSplit),
  invites: {
    invited: w.invites.invited,
    joined: w.invites.joined,
    qualified: w.invites.qualified,
    firstBooking: w.invites.first_booking,
    firstCompleted: w.invites.first_completed,
    costPerCompleted: w.invites.cost_per_completed,
    topInviter: w.invites.top_inviter,
  },
  months: w.months,
  migrated: w.migrated,
  completedTotal: w.completed_total,
  byTopic: w.by_topic,
  byStage: w.by_stage,
});

const MAPPERS = {
  overview: toOverview,
  sessions: toSessions,
  supply: toSupply,
  credits: toCredits,
  growth: toGrowth,
} as const;

/** Back on a tab within a minute: no new read (the server caches PostHog for 10). */
const STALE = 60_000;

type SectionName = keyof WireSections;
type SectionOf<K extends SectionName> = ReturnType<(typeof MAPPERS)[K]>;

/** The query string: `untyped` takes the params as given. */
const query = (w: AnalyticsWindow, compare: boolean) => windowParams(w, compare);

function useSection<K extends SectionName>(
  section: K,
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
) {
  return useQuery({
    queryKey: keys.admin.analytics(adminId ?? 'none', section, windowKey(w), compare),
    queryFn: async ({ signal }): Promise<SectionOf<K>> => {
      const { data, error, response } = await untyped.GET(`/api/v1/admin/analytics/${section}`, {
        params: { query: query(w, compare) },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return (MAPPERS[section] as unknown as (w: WireSections[K]) => SectionOf<K>)(
        data as WireSections[K],
      );
    },
    enabled: adminId !== null,
    staleTime: STALE,
    retry: retryOnce,
  });
}

/** GET /admin/analytics/overview. `adminId` null: not an admin yet, no call. */
export const useAnalyticsOverview = (
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
) => useSection('overview', adminId, w, compare);
export const useAnalyticsSessions = (
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
) => useSection('sessions', adminId, w, compare);
export const useAnalyticsSupply = (adminId: string | null, w: AnalyticsWindow, compare: boolean) =>
  useSection('supply', adminId, w, compare);
/** GET /admin/analytics/credits: on the generated client (backend #609). */
export function useAnalyticsCredits(adminId: string | null, w: AnalyticsWindow, compare: boolean) {
  return useQuery({
    queryKey: keys.admin.analytics(adminId ?? 'none', 'credits', windowKey(w), compare),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/admin/analytics/credits', {
        params: { query: query(w, compare) },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return toCredits(data);
    },
    enabled: adminId !== null,
    staleTime: STALE,
    retry: retryOnce,
  });
}
export const useAnalyticsGrowth = (adminId: string | null, w: AnalyticsWindow, compare: boolean) =>
  useSection('growth', adminId, w, compare);
