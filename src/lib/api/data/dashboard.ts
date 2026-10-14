'use client';

import type { Booking } from '@/types/booking';
import type { AppError, Remote } from '@/types/mentor';
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

  // Gate on profile and calendar together, so the setup steps are derived once
  // both have settled (no doneCount / next-step flicker as calendar arrives).
  // The screen checks `error` before `isLoading`, so a profile error still
  // surfaces at once even while calendar is still retrying.
  const isLoading = profile.isLoading || calendar.isLoading;
  const error = profile.error;
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

  return { isLoading, error, retry, data, nextSession };
}
