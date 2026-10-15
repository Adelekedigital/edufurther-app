'use client';

import type { KpiTrend } from '@/components/molecules/KpiCard/KpiCard';
import type { Booking } from '@/types/booking';
import type { AppError, Remote } from '@/types/mentor';
import { formatCount, formatRating } from '@/lib/utils/format';
import { useUpcomingBookings } from './bookings';
import { useCalendarConnection } from './calendarConnection';
import { useMentorStats, type StatBlock } from './mentorStats';
import { useMentorProfile } from './profile';

/** The mentor's own id, name and zone — the screen passes a resolved member. */
export type DashboardMember = { id: string; firstName: string };

export type SetupStepKey = 'profile' | 'sessions' | 'google' | 'share';

/**
 * The next incomplete setup step. `action` is an intent: a route to open, or a
 * `copy` of the profile link the screen performs (it owns the clipboard + the
 * announce). Kept side-effect-free so the hook stays pure data.
 */
export type SetupNext = {
  key: SetupStepKey;
  title: string;
  action: { label: string } & ({ href: string } | { copy: true });
};

export type DashboardActivation = {
  /** No completed sessions yet — the activation ("get your first booking") view. */
  isNew: boolean;
  firstName: string;
  /** Absolute profile URL for the share menu; '' until the profile has loaded. */
  shareUrl: string;
  shareName: string;
  /** The mentor's own profile path ('/mentors/{handle}') for in-app links. */
  profileHref: string;
  setup: {
    doneCount: number;
    total: number;
    /** 0–100. */
    pct: number;
    /** The one next step, or null once setup is complete (the banner then hides). */
    next: SetupNext | null;
  };
};

export type MentorDashboard = {
  /** The activation signals are loading (profile + calendar). */
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
  data: DashboardActivation | null;
  /** The KPI figures for the active-mentor view; null until the profile loads. */
  metrics: Kpi[] | null;
  /** The soonest confirmed session the mentor hosts, with its own four states. */
  nextSession: Remote<Booking | null>;
};

/** Everything the activation view is derived from — primitives only, so it is pure and testable. */
export type ActivationInputs = {
  completedSessions: number;
  /** completeness.missing (CompletenessCode[]). */
  missing: readonly string[];
  /** setup_needed: 'session_type' and/or 'weekly_hours'. */
  setupNeeded: readonly string[];
  calendarConnected: boolean;
  shared: boolean;
  firstName: string;
  /** Profile names joined; falls back to firstName for the share subject. */
  fullName: string;
  profileHref: string;
  /** window.location.origin, or '' before it is known (SSR). */
  origin: string;
};

function buildNext(
  key: SetupStepKey,
  profileHref: string,
  setupNeeded: readonly string[],
): SetupNext {
  switch (key) {
    case 'profile':
      return {
        key,
        title: 'Complete your profile',
        // The owner's own profile, where the editor lives — the same handle the
        // share link uses, not a bare id.
        action: { label: 'Edit profile', href: profileHref },
      };
    case 'sessions':
      // session_type and weekly_hours are the two things that block bookings.
      // A missing type is fixed on Sessions; hours alone on Calendar.
      return setupNeeded.includes('session_type')
        ? { key, title: 'Create your first session', action: { label: 'Create session', href: '/session-types' } }
        : { key, title: 'Open your weekly hours', action: { label: 'Set hours', href: '/calendar' } };
    case 'google':
      return { key, title: 'Connect Google Calendar', action: { label: 'Connect', href: '/integrations' } };
    case 'share':
      return { key, title: 'Share your profile', action: { label: 'Copy link', copy: true } };
  }
}

/**
 * The activation view, derived purely from the ship-today signals. Setup steps:
 * profile content is complete when completeness.missing holds only the two
 * availability codes (their own step); sessions are ready when setup_needed is
 * empty (a type + hours); Google is the calendar connection; "shared" has no
 * backend signal and is tracked locally by the screen.
 */
export function deriveActivation(i: ActivationInputs): DashboardActivation {
  const profileDone = i.missing.every((c) => c === 'session_type' || c === 'weekly_hours');
  const steps: { key: SetupStepKey; done: boolean }[] = [
    { key: 'profile', done: profileDone },
    { key: 'sessions', done: i.setupNeeded.length === 0 },
    { key: 'google', done: i.calendarConnected },
    { key: 'share', done: i.shared },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const nextKey = steps.find((s) => !s.done)?.key ?? null;
  return {
    isNew: i.completedSessions === 0,
    firstName: i.firstName,
    shareUrl: i.origin ? `${i.origin}${i.profileHref}` : '',
    shareName: i.fullName || i.firstName,
    profileHref: i.profileHref,
    setup: {
      doneCount,
      total,
      pct: Math.round((doneCount / total) * 100),
      next: nextKey ? buildNext(nextKey, i.profileHref, i.setupNeeded) : null,
    },
  };
}

/** One KPI card's content (active-mentor view). `value` is the all-time figure
 *  from the profile; `trend` is the design's ↑/↓ delta over a fixed window
 *  (current vs the equal window before), attached once the windowed stats load. */
export type Kpi = {
  key: string;
  label: string;
  value: string | null;
  unit?: string;
  info: string;
  trend?: KpiTrend;
};

/** The KPI figures — primitives only, so it is pure and testable. */
export type KpiInputs = {
  completedSessions: number;
  mentoringMinutes: number;
  menteesMentored: number;
  /** The overall rating, or null when there are no reviews. */
  rating: number | null;
  reviewCount: number;
};

export function deriveKpis(i: KpiInputs): Kpi[] {
  const hasReviews = i.reviewCount > 0;
  // The figure stays in minutes (exact); the ⓘ carries the rough hour
  // equivalent, so the card reads clean but the familiar unit is a tap away.
  const hrs = i.mentoringMinutes / 60;
  const hoursText = hrs.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return [
    {
      key: 'sessions',
      label: 'Sessions completed',
      value: String(i.completedSessions),
      info: 'Sessions marked complete since you joined',
    },
    {
      // Minutes, not rounded hours: exact, and honest for a mentor with a single
      // 90-minute session that "2 hrs" would have inflated.
      key: 'time',
      label: 'Mentoring time',
      value: formatCount(i.mentoringMinutes),
      unit: 'min',
      // Singular off the displayed figure, not the raw float: 59 min rounds to
      // "1" and must read "1 hour", never "1 hours".
      info: `≈ ${hoursText} ${hoursText === '1' ? 'hour' : 'hours'} in total — shown in minutes for precision`,
    },
    {
      key: 'mentees',
      label: 'Mentees mentored',
      value: String(i.menteesMentored),
      info: 'Unique mentees with a completed session',
    },
    {
      // A mentor with no reviews never shows a rating — "No data yet", never 0.
      // The shared formatRating helper keeps it identical to every other rating.
      key: 'rating',
      label: 'Average rating',
      value: hasReviews && i.rating != null ? formatRating(i.rating) : null,
      unit: '/ 5',
      info: 'Average of mentee reviews after completed sessions',
    },
  ];
}

// The real minus sign (U+2212), not a hyphen — the design's "−1" / "−0.4".
const MINUS = '−';

/**
 * A signed count or duration delta as a KPI trend line. `unit` is placed before
 * the period ("+120 min this month"); omit it for a bare count ("+1 this
 * month"). A flat delta reads "No change …" with no arrow — the design's
 * neutral note — so the card never shows a meaningless "+0".
 */
function countTrend(delta: number, period: string, unit?: string): KpiTrend {
  if (delta === 0) return { text: `No change ${period}`, tone: 'neutral' };
  const magnitude = Math.abs(delta).toLocaleString('en-US');
  const body = unit ? `${magnitude} ${unit} ${period}` : `${magnitude} ${period}`;
  return delta > 0
    ? { text: `+${body}`, icon: 'trending_up', tone: 'positive' }
    : { text: `${MINUS}${body}`, icon: 'trending_down', tone: 'negative' };
}

/**
 * The average-rating trend: "N reviews" from the window's own review count, then
 * the change in average to one decimal ("14 reviews · +0.2 this quarter"). No
 * reviews in the window → no trend at all (the value shows "No data yet"); a
 * window with no previous rating to compare → the review count alone, no arrow.
 */
function ratingTrend(current: StatBlock, previous: StatBlock, period: string): KpiTrend | undefined {
  const n = current.reviewCount;
  if (n <= 0) return undefined;
  const reviews = `${n} ${n === 1 ? 'review' : 'reviews'}`;
  if (current.averageRating == null || previous.averageRating == null) {
    // Keep the period, like every other trend line, so "1 review this quarter"
    // doesn't read as a lifetime total under the all-time rating.
    return { text: `${reviews} ${period}`, tone: 'neutral' };
  }
  // Round to the shown precision first, so a 4.84 → 4.80 reads "No change",
  // not a "+0.0" that rounding left behind.
  const delta = Math.round((current.averageRating - previous.averageRating) * 10) / 10;
  if (delta === 0) return { text: `${reviews} · No change ${period}`, tone: 'neutral' };
  const magnitude = Math.abs(delta).toFixed(1);
  return delta > 0
    ? { text: `${reviews} · +${magnitude} ${period}`, icon: 'trending_up', tone: 'positive' }
    : { text: `${reviews} · ${MINUS}${magnitude} ${period}`, icon: 'trending_down', tone: 'negative' };
}

/** The windowed stat blocks the KPI trends are derived from (primitives only). */
export type KpiTrendInputs = {
  /** 30-day current/previous — sessions, mentoring time, mentees ("this month"). */
  monthly: { current: StatBlock; previous: StatBlock } | null;
  /** 90-day current/previous — average rating ("this quarter"). */
  quarterly: { current: StatBlock; previous: StatBlock } | null;
};

/**
 * The per-metric trend line (the design's ↑/↓ delta), keyed by KPI key: the
 * current window minus the equal one before it. The windows are fixed to match
 * the design — sessions / time / mentees over 30 days, rating over 90. A window
 * still loading or errored yields no entry for its metrics, so the card shows
 * its value now and the trend appears when the stats arrive. Pure and tested.
 */
export function deriveKpiTrends(i: KpiTrendInputs): Record<string, KpiTrend> {
  const trends: Record<string, KpiTrend> = {};
  if (i.monthly) {
    const { current: c, previous: p } = i.monthly;
    trends.sessions = countTrend(c.completedSessions - p.completedSessions, 'this month');
    trends.time = countTrend(c.mentoringMinutes - p.mentoringMinutes, 'this month', 'min');
    trends.mentees = countTrend(c.menteesMentored - p.menteesMentored, 'this month');
  }
  if (i.quarterly) {
    const rating = ratingTrend(i.quarterly.current, i.quarterly.previous, 'this quarter');
    if (rating) trends.rating = rating;
  }
  return trends;
}

/**
 * The Mentor Dashboard's activation state, composed from signals that already
 * ship: the owner profile (completeness + setup_needed + completed sessions),
 * the Google Calendar connection, and the upcoming sessions. The "shared your
 * profile" step has no backend signal, so the screen tracks it locally and
 * passes it in. Waitlist, funnel and session metrics are later PRs.
 *
 * Called from a component that only mounts once the mentor is known, so
 * `member` is always resolved.
 */
export function useMentorDashboard(
  member: DashboardMember,
  accountZone: string,
  shared: boolean,
): MentorDashboard {
  const profile = useMentorProfile(member.id);
  const calendar = useCalendarConnection(member.id);
  const upcoming = useUpcomingBookings(member.id, accountZone, true, 'mentor');

  const p = profile.data;
  const owner = p?.owner ?? null;

  // The KPI trend row compares the mentor's own recent windows. Only the
  // active-mentor view shows the KPI strip, so gate the fetch on an active
  // mentor (a new mentor's grid never renders) rather than fetch stats no one
  // will see. Windows are fixed to the design: 30 days ("this month") for
  // sessions, time and mentees; 90 ("this quarter") for the rating.
  const activeMentorId = p && (p.mentor.completedSessions ?? 0) > 0 ? member.id : null;
  const monthly = useMentorStats(activeMentorId, { windowDays: 30 });
  const quarterly = useMentorStats(activeMentorId, { windowDays: 90 });

  // The hero row: the soonest confirmed session the mentor hosts that hasn't ended
  // yet. `as=mentor` fetches only their mentor side (so a dual-role mentor's next
  // session is never pushed off the page by mentee-side rows). The hook also keeps
  // just-settled rows whose door is still open, but those serve the Bookings tab's
  // re-entry — a finished session is deliberately not the dashboard hero, so the
  // hero stays `status === 'confirmed'`.
  const nextBooking =
    (upcoming.data ?? []).find((b) => b.side === 'mentor' && b.status === 'confirmed') ?? null;
  const nextSession: Remote<Booking | null> = {
    data: upcoming.data ? nextBooking : null,
    isLoading: upcoming.isLoading,
    error: upcoming.error,
    retry: upcoming.retry,
  };

  // Calendar feeds only the Google setup step, which is shown only to a new
  // mentor. So a new mentor waits for calendar to settle (no doneCount /
  // next-step flicker) and sees its fetch failure surfaced with a retry,
  // rather than a connected calendar silently regressing to "not connected";
  // an active mentor's Next-session card is never held or hidden by a calendar
  // blip. The screen checks `error` before `isLoading`, so a profile error
  // still shows at once even while calendar is still retrying.
  const isNewMentor = (p?.mentor.completedSessions ?? 1) === 0;
  const isLoading = profile.isLoading || (isNewMentor && calendar.isLoading);
  const error = profile.error ?? (isNewMentor ? calendar.error : null);
  const retry = () => {
    profile.retry();
    calendar.retry();
  };

  let data: DashboardActivation | null = null;
  if (!isLoading && !error && p) {
    data = deriveActivation({
      completedSessions: p.mentor.completedSessions ?? 0,
      missing: owner?.completeness?.missing ?? [],
      setupNeeded: owner?.setupNeeded ?? [],
      // A revoked / errored grant still returns an object; only an active
      // connection counts as done, so a broken one keeps prompting a reconnect.
      calendarConnected: calendar.data?.status === 'active',
      shared,
      firstName: member.firstName,
      fullName: [p.names.first, p.names.last].filter(Boolean).join(' '),
      profileHref: p.mentor.profileHref,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    });
  }

  // KPIs need only the profile, so they are ready as soon as it loads (the
  // active view, where calendar is irrelevant).
  const baseMetrics: Kpi[] | null =
    !profile.isLoading && !profile.error && p
      ? deriveKpis({
          completedSessions: p.mentor.completedSessions ?? 0,
          mentoringMinutes: p.mentoringMinutes ?? 0,
          menteesMentored: p.menteesMentored ?? 0,
          rating: p.mentor.rating ?? null,
          reviewCount: p.mentor.reviewCount ?? 0,
        })
      : null;

  // The ↑/↓ delta per metric, attached once each window's stats load. A stats
  // blip never holds up or blanks the figures above: a missing window just
  // means no trend line yet (KpiCard renders the value without one).
  const trends = deriveKpiTrends({
    monthly: monthly.data ? { current: monthly.data.current, previous: monthly.data.previous } : null,
    quarterly: quarterly.data
      ? { current: quarterly.data.current, previous: quarterly.data.previous }
      : null,
  });
  const metrics: Kpi[] | null =
    baseMetrics?.map((k) => {
      const trend = trends[k.key];
      return trend ? { ...k, trend } : k;
    }) ?? null;

  return { isLoading, error, retry, data, metrics, nextSession };
}
