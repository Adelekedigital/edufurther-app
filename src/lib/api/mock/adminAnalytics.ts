import type {
  WireAnalyticsAlert,
  WireAnalyticsWindow,
  WireBehaviour,
  WireCredits,
  WireFunnel,
  WireGrowth,
  WireMetric,
  WireOverview,
  WireActiveMembersField,
  WireSections,
  WireSessions,
  WireSupply,
  WireFunnelFigure,
} from '@/lib/api/data/pendingAnalytics';
import { FUNNEL_COPY } from '@/lib/copy/adminAnalytics';

/**
 * MOCK of Admin Analytics (PRD 31). PENDING BACKEND. The numbers are the
 * design's sample data (Admin Analytics.dc.html), scaled to the window's
 * length; the shapes are the ones agreed with edufurtherbe-24 on 9 Nov.
 */

export type MockQuery = {
  window?: string;
  from?: string;
  to?: string;
  compare?: string;
  /** IANA zone the days follow (v2, backend decision 335); absent = UTC. */
  tz?: string;
};

/**
 * A real IANA zone, as the backend checks it (an unknown one is a 422). The
 * backend matches the zone database's own names exactly, so a case variant
 * ("utc", "africa/lagos") is a 422 too, though Intl would accept it.
 */
function validZone(tz: string): boolean {
  return tz === 'UTC' || Intl.supportedValuesOf('timeZone').includes(tz);
}

const DAY = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The window's days and its previous period, or null for a bad query (a 422). */
export function mockWindow(
  q: MockQuery,
  now = new Date(),
): { days: number; compare: boolean; window: WireAnalyticsWindow } | null {
  const tz = q.tz ?? 'UTC';
  if (!validZone(tz)) return null;
  // "Today" is the viewer's date in that zone (en-CA formats as YYYY-MM-DD).
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
  let from: string;
  let to: string;
  if (q.from || q.to) {
    if (!q.from || !q.to || q.window) return null;
    // A real calendar date: 2025-02-31 doesn't round-trip.
    const real = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && iso(Date.parse(d)) === d;
    if (!real(q.from) || !real(q.to)) return null;
    if (q.from > q.to || q.from < '2024-06-01' || q.to > today) return null;
    ({ from, to } = q as { from: string; to: string });
  } else {
    const n = { '7d': 7, '30d': 30, '90d': 90 }[q.window ?? '30d'];
    if (!n) return null;
    to = today;
    from = iso(Date.parse(today) - (n - 1) * DAY);
  }
  if (q.compare !== undefined && q.compare !== 'true' && q.compare !== 'false') return null;
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  // Built apart, not inline: `tz` is in the backend's next spec but not yet
  // in this one, so it must type-check both before and after the release.
  const window = {
    from,
    to,
    previous_from: iso(Date.parse(from) - days * DAY),
    previous_to: iso(Date.parse(from) - DAY),
    tz,
  };
  return { days, compare: q.compare !== 'false', window };
}

/** The alerts the mock raises, newest first, so the count and its list can be seen in dev. */
const ALERTS: WireAnalyticsAlert[] = [
  {
    key: 'no_booking_requests',
    title: 'No booking requests',
    body: 'No one has asked for a session in the last 7 days.',
    link: { tab: 'sessions' },
    raised_at: '2026-11-09T07:00:00Z',
  },
  {
    key: 'no_signups',
    title: 'No sign-ups',
    body: 'No one has signed up in the last 7 days.',
    link: { tab: 'funnels', funnel: 'signup' },
    raised_at: '2026-11-09T06:00:00Z',
  },
];

type Ctx = NonNullable<ReturnType<typeof mockWindow>> & { alerts: boolean };

const scale = (c: Ctx, n: number) => Math.max(0, Math.round((n * c.days) / 30));
const metric = (c: Ctx, value: number, previous: number): WireMetric => ({
  value,
  previous: c.compare ? previous : null,
});
const count = (c: Ctx, value: number, previous: number) =>
  metric(c, scale(c, value), scale(c, previous));
const head = (c: Ctx) => ({ window: c.window, alerts: c.alerts ? ALERTS : [] });

function overview(c: Ctx): WireOverview & WireActiveMembersField {
  const unit = c.days <= 14 ? 'day' : 'week';
  const n = unit === 'day' ? c.days : Math.ceil(c.days / 7);
  const base = unit === 'day' ? 6 : 42;
  const wobble = [
    0.07, -0.09, 0.14, -0.05, 0.12, 0.02, -0.07, 0.09, 0.05, -0.02, 0.14, 0.07, -0.05,
  ];
  const series = Array.from({ length: n }, (_, i) => {
    const value = Math.round(base * (1 + (i * 0.35) / n) + base * wobble[i % 13]!);
    return {
      start: iso(Date.parse(c.window.from) + i * (unit === 'day' ? 1 : 7) * DAY),
      value,
      previous: c.compare
        ? Math.max(0, Math.round(value * 0.88 + [2, 1, -3, 4, -2][i % 5]!))
        : null,
    };
  });
  const spark = (seed: number, up: boolean): (number | null)[] =>
    Array.from(
      { length: 8 },
      (_, i) => 20 + (up ? i * 1.6 : -i * 0.6) + [3, -2, 4, -3, 2, -1, 3, 0][(i + seed) % 8]!,
    );
  const rate = (
    key: WireOverview['features'][number]['key'],
    v: number,
    p: number | null,
    contribution: number | null,
    i: number,
  ) => ({
    key,
    value: { value: v, previous: c.compare ? p : null },
    spark: spark(i, p === null || v >= p),
    contribution,
  });
  return {
    ...head(c),
    north_star: { completed: count(c, 214, 191), unit, series },
    sub_tracks: {
      unique_mentees: count(c, 163, 148),
      mentors_delivered: metric(c, 41, 38),
      sessions_per_mentee: metric(c, 1.31, 1.29),
      // Rolling counts on the window's last day (decision 342): they don't
      // scale with the window. The backend's mock values; the split below adds up.
      weekly_active_users: metric(c, 246, 221),
      monthly_active_users: metric(c, 612, 575),
      stickiness: metric(c, 40.2, 38.4),
    },
    // Backend edufurtherbe-5e's agreed shape (2026-11-12) and mock values.
    active_members: {
      history_from: '2026-11-12',
      by_role: {
        mentee: {
          weekly: metric(c, 204, 180),
          monthly: metric(c, 521, 490),
          stickiness: metric(c, 39.2, 36.7),
        },
        mentor: {
          weekly: metric(c, 42, 41),
          monthly: metric(c, 91, 85),
          stickiness: metric(c, 46.2, 48.2),
        },
      },
      // WAU at each North Star point; the first is before history began (a gap).
      series: series.map((pt, i) => {
        const wau = i === 0 ? null : Math.round(221 + ((246 - 221) * i) / Math.max(1, n - 1));
        const value = i === n - 1 ? 246 : wau;
        const previous = c.compare && value !== null ? Math.round(value * 0.9) : null;
        // mentee + mentor = value; null with it (the backend's rule).
        const part = (v: number | null, share: number) =>
          v === null ? null : Math.round(v * share);
        const mentee = { value: part(value, 204 / 246), previous: part(previous, 204 / 246) };
        return {
          start: pt.start,
          value,
          previous,
          by_role: {
            mentee,
            mentor: {
              value: value === null ? null : value - mentee.value!,
              previous: previous === null ? null : previous - mentee.previous!,
            },
          },
        };
      }),
    },
    features: [
      rate('booking', 71, 68, null, 0),
      // Explore and matching reads PostHog (backend PR 633); null only when it isn't answering.
      rate('explore', 34, 31, null, 1),
      rate('messaging', 64, 66, 58, 2),
      // A "now" number: nothing to compare with until a snapshot exists (Q1).
      rate('mentor_supply', 58, null, null, 3),
      rate('invites', 27, 24, scale(c, 12), 4),
      rate('mentee_activation', 22, 19, null, 5),
      rate('mentor_activation', 46, 41, scale(c, 9), 6),
    ],
  };
}

function sessions(c: Ctx): WireSessions {
  const requests = scale(c, 302);
  const part = (pct: number) => Math.round((requests * pct) / 100);
  return {
    ...head(c),
    kpis: {
      requests: count(c, 302, 281),
      acceptance_rate: metric(c, 84, 82),
      median_reply_hours: metric(c, 6.2, 7.1),
      show_up_rate: metric(c, 91, 92),
      repeat_booking_rate: metric(c, 34, 31),
      average_rating: metric(c, 4.8, 4.8),
      review_rate: metric(c, 58, 55),
      reports: metric(c, 2, 1),
    },
    outcomes: {
      requests,
      completed: part(71),
      cancelled: part(9),
      expired: part(9),
      no_show: part(6),
      declined: part(5),
    },
    top_no_show_reason: { reason: 'forgot', share: 41 },
    guardrails: {
      no_show_rate: metric(c, 6.8, 5.9),
      request_expiry_rate: metric(c, 9.2, 9.6),
      credit_expiry_rate: metric(c, 31, 28),
    },
  };
}

function supply(c: Ctx): WireSupply {
  const place = (key: string, name: string, mentees: number, bookable: number) => ({
    key,
    name,
    mentees,
    bookable_mentors: bookable,
  });
  return {
    ...head(c),
    cohort: {
      applied: scale(c, 38),
      approved: scale(c, 21),
      listed: scale(c, 19),
      bookable: scale(c, 11),
    },
    median_review_days: 3.4,
    unlisted: 2,
    by_country: [
      place('GB', 'United Kingdom', 96, 6),
      place('CA', 'Canada', 71, 5),
      place('US', 'United States', 64, 9),
      place('DE', 'Germany', 22, 4),
      place('IE', 'Ireland', 14, 3),
    ],
    by_school: [
      place('toronto', 'University of Toronto', 31, 2),
      place('manchester', 'University of Manchester', 27, 3),
      place('imperial', 'Imperial College London', 19, 2),
      place('tum', 'TU Munich', 9, 1),
      place('ucd', 'University College Dublin', 7, 0),
    ],
  };
}

function credits(c: Ctx): WireCredits {
  const row = (
    source: WireCredits['by_source'][number]['source'],
    g: number,
    s: number,
    r: number,
    e: number,
  ) => ({
    source,
    granted: scale(c, g),
    spent: scale(c, s),
    refunded: scale(c, r),
    expired: scale(c, e),
  });
  return {
    ...head(c),
    flow: {
      granted: scale(c, 486),
      spent: scale(c, 271),
      refunded: scale(c, 38),
      expired: scale(c, 151),
    },
    by_source: [
      row('monthly', 240, 162, 21, 57),
      row('level_up', 168, 64, 9, 64),
      row('admin', 24, 7, 2, 15),
      row('refund', 38, 20, 0, 5),
      row('carried_over', 54, 38, 6, 10),
    ],
  };
}

function growth(c: Ctx): WireGrowth {
  const now = new Date(`${c.window.to}T12:00:00Z`);
  const months = [61, 74, 69, 92, 118, 37].map((n, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
    return { month: d.toISOString().slice(0, 7), count: n };
  });
  const total = scale(c, 214);
  const share = (pct: number) => Math.round((total * pct) / 100);
  return {
    ...head(c),
    signups: { all: count(c, 214, 196), mentees: count(c, 176, 163), mentors: count(c, 38, 33) },
    // Empty until PRD 30 records the sign-up source and channel.
    by_source: [],
    by_channel: [],
    invites: {
      invited: scale(c, 120),
      joined: scale(c, 46),
      qualified: scale(c, 31),
      first_booking: scale(c, 18),
      first_completed: scale(c, 12),
      cost_per_completed: null,
      top_inviter: { name: 'Amara Okafor', joined: 9 },
    },
    months,
    migrated: { count: 1204, on: null },
    completed_total: total,
    by_topic: [
      { key: 'application_documents', name: 'Application documents', count: share(44) },
      { key: 'school_selection', name: 'School selection', count: share(31) },
      { key: 'program_selection', name: 'Program selection', count: share(29) },
      { key: 'scholarships_funding', name: 'Scholarships & funding', count: share(22) },
      { key: 'visa_interview', name: 'Visa and interview', count: share(14) },
      { key: 'career_guidance', name: 'Career guidance', count: share(9) },
    ],
    by_stage: [
      { key: 'exploring', count: share(46) },
      { key: 'researching', count: share(12) },
      { key: 'preparing_documents', count: share(24) },
      { key: 'applying', count: share(10) },
      { key: 'interview_prep', count: share(6) },
      { key: 'awaiting_decision', count: share(9) },
      { key: 'not_set', count: share(15) },
    ],
  };
}

const SECTIONS: { [K in keyof WireSections]: (c: Ctx) => WireSections[K] } = {
  overview,
  sessions,
  supply,
  credits,
  growth,
};

export const isMockSection = (s: string): s is keyof WireSections => s in SECTIONS;

export function mockSection<K extends keyof WireSections>(
  section: K,
  c: NonNullable<ReturnType<typeof mockWindow>>,
  alerts = true,
): WireSections[K] {
  return SECTIONS[section]({ ...c, alerts });
}

/** Funnels v2 (backend decision 338): key, label, count, layer. */
type MockStep = [string, string, number, 'primary' | 'secondary'];
const FUNNELS: Record<string, MockStep[]> = {
  signup: [
    ['started', 'Started sign-up', 640, 'primary'],
    ['code_verified', 'Code verified', 498, 'primary'],
    ['onboarded', 'Onboarding done', 371, 'primary'],
  ],
  booking: [
    ['started', 'Booking started', 520, 'primary'],
    ['type_picked', 'Type picked', 431, 'primary'],
    ['time_picked', 'Time picked', 344, 'primary'],
    ['questions_done', 'Questions done', 318, 'primary'],
    ['requested', 'Requested', 302, 'primary'],
    ['completed', 'Completed', 214, 'primary'],
  ],
  mentee_activation: [
    ['onboarded', 'Onboarding done', 162, 'primary'],
    ['first_request', 'First request', 71, 'primary'],
    ['first_session', 'First session (14 days)', 47, 'secondary'],
  ],
  mentor_activation: [
    ['approved', 'Approved', 12, 'primary'],
    ['availability_set', 'Availability set', 11, 'primary'],
    ['session_type_created', 'Session created', 7, 'primary'],
    ['first_booking_received', 'First booking (30 days)', 6, 'secondary'],
    ['first_session_delivered', 'First session (30 days)', 3, 'secondary'],
  ],
  mentor_application: [
    ['started', 'Started', 92, 'primary'],
    ['about_you', 'About you', 74, 'primary'],
    ['education', 'Education', 61, 'primary'],
    ['hours', 'Hours', 44, 'primary'],
    ['submitted', 'Submitted', 38, 'primary'],
    ['approved', 'Approved', 21, 'primary'],
  ],
};

/** The figures beside each funnel (decision 338); [] for the others. */
const FIGURES: Record<string, WireFunnelFigure[]> = {
  mentor_activation: [
    { key: 'days_to_bookable', label: 'Days to bookable', value: 2.5, previous: 3.0, unit: 'days' },
    {
      key: 'calendar_connected',
      label: 'Connected a calendar (of approved)',
      value: 41.7,
      previous: 33.3,
      unit: 'percent',
    },
    {
      key: 'profile_link_shared',
      label: 'Shared their profile link (of approved, with analytics on)',
      value: null,
      previous: null,
      unit: 'percent',
    },
  ],
  mentor_application: [
    {
      key: 'median_review_days',
      label: 'Median days in review',
      value: 2,
      previous: 3,
      unit: 'days',
    },
  ],
};

const BY_SHARE: Record<string, number> = {
  mentee: 0.82,
  mentor: 0.18,
  migrated: 0.55,
  invite: 0.35,
  direct: 0.65,
};

export const isMockFunnel = (name: string) => name in FUNNELS;

export function mockFunnel(
  name: string,
  by: string,
  c: NonNullable<ReturnType<typeof mockWindow>>,
): WireFunnel {
  const k = by === 'all' || !by ? 1 : (BY_SHARE[by] ?? 0.3);
  return {
    window: c.window,
    alerts: [],
    name: name as WireFunnel['name'],
    by: by || 'all',
    note: FUNNEL_COPY[name as WireFunnel['name']].note,
    // The backend's windows: booking 60 days, mentee activation 14, the rest 30.
    window_days: name === 'booking' ? 60 : name === 'mentee_activation' ? 14 : 30,
    // Built apart from the literal: layer and figures are in the backend's
    // next spec, not yet this one, so this type-checks before and after.
    ...v2(name, k, c),
  };
}

function v2(name: string, k: number, c: NonNullable<ReturnType<typeof mockWindow>>) {
  const steps = FUNNELS[name]!.map(([key, label, v, layer]) => ({
    key,
    label,
    value: Math.max(1, Math.round(((v * c.days) / 30) * k)),
    previous: c.compare ? Math.max(1, Math.round(((v * 0.9 * c.days) / 30) * k)) : null,
    layer,
  }));
  // previous is null with compare off (the backend's rule).
  const figures = (FIGURES[name] ?? []).map((f) => (c.compare ? f : { ...f, previous: null }));
  return { steps, figures };
}

export function mockBehaviour(c: NonNullable<ReturnType<typeof mockWindow>>): WireBehaviour {
  const s = (n: number) => Math.round((n * c.days) / 30);
  return {
    window: c.window,
    alerts: [],
    login: { attempts: s(1840), failed_rate: 7.4, failed_migrated_rate: 11.8 },
    search: { searches: s(1260), no_result_rate: 14, profile_views: s(512) },
    profile_views_by_source: [
      { source: 'explore', share: 46 },
      { source: 'home', share: 31 },
      { source: 'invite_link', share: 14 },
      { source: 'other', share: 9 },
    ],
    joining: { clicked: s(398), failed: s(11), median_minutes_before: 3 },
    writing_assist: { used: s(176), accepted_rate: 61, discarded_rate: 22 },
    app: { installed: s(84), push_allowed_rate: 47 },
    errors_by_screen: [
      { route: '/bookings', count: s(23) },
      { route: '/explore', count: s(9) },
      { route: '/messages', count: s(6) },
    ],
    replays_url: 'https://eu.posthog.com/replay/recent',
  };
}
