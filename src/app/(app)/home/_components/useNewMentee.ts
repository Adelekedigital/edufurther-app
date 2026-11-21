'use client';

import { useMemo } from 'react';
import { usePendingBookings } from '@/lib/api/data/bookings';
import { degreeValue } from '@/lib/api/data/onboarding';
import type { useMenteeGoals } from '@/lib/api/data/goals';
import { useOwnEducation } from '@/lib/api/data/profileEntries';
import { useMenteeProfile } from '@/lib/api/data/settings';
import { DEGREE_OPTIONS } from '@/lib/copy/onboarding';
import type { Booking } from '@/types/booking';
import type { Remote, Topic } from '@/types/mentor';
import { doneCount, profileFields, type FirstBooking, type ProfileField } from './newMentee';

type Args = {
  userId: string | null;
  /** Read only while the new view can show. */
  active: boolean;
  /**
   * The four profile details are read for the full Home too (its Profile
   * strength card), so the education and profile reads follow this as well.
   */
  readProfile: boolean;
  goals: ReturnType<typeof useMenteeGoals>;
  topics: Topic[];
  /** Confirmed upcoming rows (the screen already reads them). */
  upcoming: Remote<Booking[]>;
};

/** The earliest mentee-side request or booking still ahead. */
function firstAhead(pending: Booking[], upcoming: Booking[]): FirstBooking | null {
  const rows = [
    ...pending.filter((b) => b.side === 'mentee').map((b) => ({ b, confirmed: false })),
    ...upcoming.filter((b) => b.side === 'mentee').map((b) => ({ b, confirmed: true })),
  ].sort((x, y) => Date.parse(x.b.startsAt) - Date.parse(y.b.startsAt));
  const r = rows[0];
  return r
    ? { mentorFirst: r.b.other.name.split(' ')[0]!, startsAt: r.b.startsAt, confirmed: r.confirmed }
    : null;
}

/**
 * What the new mentee's Home reads (Mentee Dashboard v2.dc.html, newHome
 * nextStep): the four profile details, the first request or booking, and
 * whether all of that has loaded. The details alone (`profile`) also feed the
 * full Home's Profile strength card.
 */
export function useNewMentee({ userId, active, readProfile, goals, topics, upcoming }: Args) {
  const pending = usePendingBookings(userId, active);
  const details = active || readProfile;
  const education = useOwnEducation(userId, details);
  const profile = useMenteeProfile(details ? userId : null);

  const goalParts = useMemo(() => {
    const g = goals.read?.goal ?? null;
    return {
      degree: DEGREE_OPTIONS.find((d) => d.value === degreeValue(g))?.label ?? null,
      field: g?.field_of_study?.trim() || null,
      country:
        [...(g?.countries ?? [])].sort((a, b) => a.priority - b.priority)[0]?.display_name ?? null,
    };
  }, [goals.read]);

  const fields: ProfileField[] = useMemo(() => {
    const g = goals.read?.goal ?? null;
    const helpAreas = (g?.needs ?? []).map(
      (n) => topics.find((t) => t.id === n.id)?.label ?? n.display_name,
    );
    return profileFields({
      ...goalParts,
      helpAreas,
      education: education.entries,
      bio: profile.profile?.bio ?? '',
      bioDrafted: profile.profile?.bioDrafted ?? false,
    });
  }, [goals.read, goalParts, topics, education.entries, profile.profile]);

  const booked = firstAhead(pending.data ?? [], upcoming.data ?? []);

  // The four details alone: a failed or pending read never claims the profile
  // is complete or incomplete (the strength card hides instead).
  const detailsStatus: 'loading' | 'error' | 'ready' =
    goals.status === 'error' || education.status === 'error' || profile.status === 'error'
      ? 'error'
      : goals.status === 'loading' || education.status === 'loading' || profile.status === 'loading'
        ? 'loading'
        : 'ready';

  // A failed read would read as "not done" and show a wrong stage: the view
  // says it couldn't load instead.
  const error =
    goals.status === 'error' ||
    education.status === 'error' ||
    profile.status === 'error' ||
    !!pending.error ||
    !!upcoming.error;
  const loading =
    !error &&
    (goals.status === 'loading' ||
      education.status === 'loading' ||
      profile.status === 'loading' ||
      pending.isLoading ||
      upcoming.isLoading);
  const retry = () => {
    if (goals.status === 'error') goals.retry();
    if (education.status === 'error') education.retry();
    if (profile.status === 'error') profile.retry();
    if (pending.error) pending.retry();
    if (upcoming.error) upcoming.retry();
  };

  return {
    fields,
    goalParts,
    /** The mentee's degrees, for the profile sheet's Education editor. */
    education: education.entries,
    profileDone: doneCount(fields) === 4,
    booked,
    /** The four details' own state, for the full Home's Profile strength card. */
    detailsStatus,
    loading,
    error,
    retry,
    /** The mentee profile as Settings saves it, for the bio edit. */
    menteeProfile: profile.profile,
  };
}
