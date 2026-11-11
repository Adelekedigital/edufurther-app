'use client';

import { skipToken, useQuery } from '@tanstack/react-query';
import { windowKey, windowParams, type AnalyticsWindow, type Metric } from '@/lib/utils/analytics';
import { ApiError, apiError, retryOnce } from './errors';
import { keys } from './keys';
import { api } from './http';
import type {
  WireAlertKey,
  WireAnalyticsAlert,
  WireBehaviour,
  WireCreditSource,
  WireCredits,
  WireFeatureKey,
  WireFunnel,
  WireGrowth,
  WireNoShowReason,
  WireOverview,
  WireProfileViewSource,
  WireSections,
  WireSessions,
  WireStageKey,
  WireSupply,
} from './pendingAnalytics';

// Admin Analytics (PRD 31): every route is on the generated client (backend
// #609, #614, #618 for the database tabs; #633 for funnels and Behaviour).

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
    /** 8 points; a point with nothing to divide by is null (a gap), never 0. */
    spark: (number | null)[] | null;
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
/** `completedShare` null: no members to divide by. */
export type SplitRow = { key: string; members: number; completedShare: number | null };

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

const toSplit = (
  r: WireGrowth['by_source'][number] | WireGrowth['by_channel'][number],
): SplitRow => ({
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

/** The query string, as both clients take it. */
const query = (w: AnalyticsWindow, compare: boolean, tz: string) => windowParams(w, compare, tz);

const getSection = (
  section: SectionName,
  w: AnalyticsWindow,
  compare: boolean,
  tz: string,
  signal: AbortSignal,
) =>
  api.GET(`/api/v1/admin/analytics/${section}`, {
    params: { query: query(w, compare, tz) },
    signal,
  });

/**
 * Every analytics read takes the zone its days follow. `tz` null: not known
 * yet (before the page has read the browser's zone), so no call, and never a
 * call in the server's own zone.
 */
function useSection<K extends SectionName>(
  section: K,
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
  tz: string | null,
) {
  return useQuery({
    queryKey: keys.admin.analytics(adminId ?? 'none', section, windowKey(w, tz ?? ''), compare),
    // skipToken while the zone is unknown: even a refetch can't ask then.
    queryFn:
      tz === null
        ? skipToken
        : async ({ signal }): Promise<SectionOf<K>> => {
            const { data, error, response } = await getSection(section, w, compare, tz, signal);
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
  tz: string | null,
) => useSection('overview', adminId, w, compare, tz);
export const useAnalyticsSessions = (
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
  tz: string | null,
) => useSection('sessions', adminId, w, compare, tz);
export const useAnalyticsSupply = (
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
  tz: string | null,
) => useSection('supply', adminId, w, compare, tz);
/** GET /admin/analytics/credits. */
export const useAnalyticsCredits = (
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
  tz: string | null,
) => useSection('credits', adminId, w, compare, tz);
export const useAnalyticsGrowth = (
  adminId: string | null,
  w: AnalyticsWindow,
  compare: boolean,
  tz: string | null,
) => useSection('growth', adminId, w, compare, tz);

// ---- PostHog: funnels and events ---------------------------------------------

export const ANALYTICS_UPSTREAM = '/problems/analytics-upstream';

/**
 * PostHog isn't answering (the backend's own problem type, never any 503: a
 * proxy's 503 isn't a PostHog outage): Behaviour shows its notice, the
 * database cards still load.
 */
export const isUpstreamDown = (e: unknown) =>
  e instanceof ApiError && e.type === ANALYTICS_UPSTREAM;

/** A PostHog outage won't clear on an immediate retry. */
const retryUnlessDown = (n: number, e: unknown) => !isUpstreamDown(e) && retryOnce(n, e);

export type Funnel = WireFunnel['steps'];

/** GET /admin/analytics/funnels/{name}?by= */
export function useAnalyticsFunnel(
  adminId: string | null,
  name: FunnelName,
  by: string,
  w: AnalyticsWindow,
  tz: string | null,
) {
  return useQuery({
    queryKey: keys.admin.analyticsFunnel(adminId ?? 'none', name, by, windowKey(w, tz ?? '')),
    queryFn:
      tz === null
        ? skipToken
        : async ({ signal }): Promise<Funnel> => {
            const { data, error, response } = await api.GET(
              '/api/v1/admin/analytics/funnels/{name}',
              {
                // The previous period isn't shown on a funnel: not asked for.
                params: { path: { name }, query: { ...query(w, false, tz), by } },
                signal,
              },
            );
            if (!response.ok || !data) throw apiError(response.status, error, response);
            return data.steps;
          },
    enabled: adminId !== null,
    staleTime: STALE,
    retry: retryUnlessDown,
  });
}

/** The event cards' numbers: rates are percentages, null with nothing to divide by. */
export type Behaviour = {
  login: { attempts: number; failedRate: number | null; failedMigratedRate: number | null };
  search: { searches: number; noResultRate: number | null; profileViews: number };
  profileViewsBySource: { source: WireProfileViewSource; share: number | null }[];
  joining: { clicked: number; failed: number; medianMinutesBefore: number | null };
  writingAssist: { used: number; acceptedRate: number | null; discardedRate: number | null };
  app: { installed: number; pushAllowedRate: number | null };
  errorsByScreen: { route: string; count: number }[];
  replaysUrl: string | null;
};

export const toBehaviour = (w: WireBehaviour): Behaviour => ({
  login: {
    attempts: w.login.attempts,
    failedRate: w.login.failed_rate,
    failedMigratedRate: w.login.failed_migrated_rate,
  },
  search: {
    searches: w.search.searches,
    noResultRate: w.search.no_result_rate,
    profileViews: w.search.profile_views,
  },
  profileViewsBySource: w.profile_views_by_source,
  joining: {
    clicked: w.joining.clicked,
    failed: w.joining.failed,
    medianMinutesBefore: w.joining.median_minutes_before,
  },
  writingAssist: {
    used: w.writing_assist.used,
    acceptedRate: w.writing_assist.accepted_rate,
    discardedRate: w.writing_assist.discarded_rate,
  },
  app: { installed: w.app.installed, pushAllowedRate: w.app.push_allowed_rate },
  errorsByScreen: w.errors_by_screen,
  replaysUrl: w.replays_url,
});

/** GET /admin/analytics/behaviour: the event cards. */
export function useAnalyticsBehaviour(
  adminId: string | null,
  w: AnalyticsWindow,
  tz: string | null,
) {
  return useQuery({
    queryKey: keys.admin.analytics(adminId ?? 'none', 'behaviour', windowKey(w, tz ?? ''), false),
    queryFn:
      tz === null
        ? skipToken
        : async ({ signal }): Promise<Behaviour> => {
            // The event cards show no change: the previous period isn't asked for.
            const { data, error, response } = await api.GET('/api/v1/admin/analytics/behaviour', {
              params: { query: query(w, false, tz) },
              signal,
            });
            if (!response.ok || !data) throw apiError(response.status, error, response);
            return toBehaviour(data);
          },
    enabled: adminId !== null,
    staleTime: STALE,
    retry: retryUnlessDown,
  });
}
