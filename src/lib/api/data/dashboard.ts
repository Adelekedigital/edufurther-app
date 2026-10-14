'use client';

import type { Booking } from '@/types/booking';
import type { AppError, Remote } from '@/types/mentor';
import { formatRating } from '@/lib/utils/format';
import { useUpcomingBookings } from './bookings';
import { useCalendarConnection } from './calendarConnection';
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
    setup: {
      doneCount,
      total,
      pct: Math.round((doneCount / total) * 100),
      next: nextKey ? buildNext(nextKey, i.profileHref, i.setupNeeded) : null,
    },
  };
}

/** One KPI card's content (active-mentor view). No trend line: the backend is
 *  all-time only, so the design's month-over-month figure is omitted until
 *  period data exists (design-divergence.md). */
export type Kpi = { key: string; label: string; value: string | null; unit?: string; info: string };

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
  const hours = Math.round(i.mentoringMinutes / 60);
  return [
    {
      key: 'sessions',
      label: 'Sessions completed',
      value: String(i.completedSessions),
      info: 'Sessions marked complete since you joined',
    },
    {
      key: 'hours',
      label: 'Mentoring time',
      value: String(hours),
      // Pluralised off the figure, so 60 min reads "1 hr", not "1 hrs".
      unit: hours === 1 ? 'hr' : 'hrs',
      info: 'Estimated from completed session lengths',
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
  const upcoming = useUpcomingBookings(member.id, accountZone);

  const p = profile.data;
  const owner = p?.owner ?? null;

  // The hero row: the soonest confirmed session the mentor hosts. The list mixes
  // both sides (a mentor can book as a mentee), so filter to their mentor side.
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
  const metrics: Kpi[] | null =
    !profile.isLoading && !profile.error && p
      ? deriveKpis({
          completedSessions: p.mentor.completedSessions ?? 0,
          mentoringMinutes: p.mentoringMinutes ?? 0,
          menteesMentored: p.menteesMentored ?? 0,
          rating: p.mentor.rating ?? null,
          reviewCount: p.mentor.reviewCount ?? 0,
        })
      : null;

  return { isLoading, error, retry, data, metrics, nextSession };
}
