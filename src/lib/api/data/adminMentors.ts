'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { coverKey, type CoverKey } from '@/lib/utils/cover';
import type { EducationRow } from '@/lib/utils/educationLine';
import { personCover, personInitials } from '@/lib/utils/person';
import { safeSocialUrl } from '@/lib/utils/socialUrl';
import { weeklyHoursLines } from '@/lib/utils/weeklyHoursSummary';
import { ApiError, apiError, retryOnce } from './errors';
import { api } from './http';
import { DELETED_NAME } from './bookings';
import { keys } from './keys';
import { toWeeklyHours } from './weeklyHours';

type Schemas = components['schemas'];
type EducationRead = Schemas['app__api__schemas__profile__EducationRead'];
type WireMentorRow = Schemas['AdminMentorRowRead'];
type WireMentorDetail = Schemas['AdminMentorRead'];
type WireMentorTab = Schemas['AdminMentorTab'];
type WireShowUpTier = Schemas['ShowUpTier'];
type WireAdminNote = Schemas['AdminNoteRead'];
type WireAdminPerson = Schemas['AdminNoteAuthorRead'];
export type BulkDecision = Schemas['BulkDecisionRead'];
/** upcoming = not started yet; awaiting_outcome = started, not settled. */
export type BookingOutcome = Schemas['BookingOutcome'];

export type MentorTab = 'applications' | 'approved' | 'paused' | 'notApproved';
export const MENTOR_TABS: readonly MentorTab[] = [
  'applications',
  'approved',
  'paused',
  'notApproved',
];
const WIRE_TAB: Record<MentorTab, WireMentorTab> = {
  applications: 'applications',
  approved: 'approved',
  paused: 'paused',
  notApproved: 'not_approved',
};
const TAB_OF: Record<WireMentorTab, MentorTab> = {
  applications: 'applications',
  approved: 'approved',
  paused: 'paused',
  not_approved: 'notApproved',
};

/** The backend's tier, never recomputed here (backend reply A3). */
export type ShowUpTier = 'onTrack' | 'needsAttention' | 'atRisk';
const toTier = (t: WireShowUpTier | null): ShowUpTier | null =>
  t === 'on_track'
    ? 'onTrack'
    : t === 'needs_attention'
      ? 'needsAttention'
      : t === 'at_risk'
        ? 'atRisk'
        : null;

/** A person as the admin pages draw them: one look everywhere (`lib/utils/person`). */
export type AdminPerson = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  cover: CoverKey;
  photoUrl: string | null;
};

/**
 * `fallback` names someone with no name (a mentor's email); with none, they
 * read as Bookings' "Deleted user", never a blank.
 */
export function toAdminPerson(p: WireAdminPerson, fallback = ''): AdminPerson {
  const first = p.first_name?.trim() ?? '';
  const last = p.last_name?.trim() ?? '';
  const name = [first, last].filter(Boolean).join(' ') || fallback || DELETED_NAME;
  return {
    id: p.user_id,
    name,
    firstName: first || name.split(' ')[0] || name,
    // No name and no fallback: no initials, so the avatar draws the DS person glyph.
    initials: personInitials(first, last, fallback),
    cover: personCover(p.user_id, coverKey(p.cover_color)),
    photoUrl: p.avatar_url,
  };
}

/** One row of a Mentors tab (A3). Dates are ISO instants; the page formats them. */
export type AdminMentorRow = AdminPerson & {
  handle: string | null;
  email: string;
  submittedAt: string | null;
  approvedAt: string | null;
  decidedAt: string | null;
  pausedAt: string | null;
  pausedBy: 'admin' | 'mentor' | null;
  pausedReason: string | null;
  declineReason: string | null;
  waitingDays: number | null;
  school: { name: string; country: string | null } | null;
  completed: number;
  upcoming: number;
  showUpRate: number | null;
  showUpTier: ShowUpTier | null;
};

export function toAdminMentorRow(w: WireMentorRow): AdminMentorRow {
  return {
    ...toAdminPerson(w, w.email),
    handle: w.handle,
    email: w.email,
    submittedAt: w.submitted_at,
    approvedAt: w.approved_at,
    decidedAt: w.decided_at,
    pausedAt: w.paused_at,
    pausedBy: w.paused_by,
    pausedReason: w.paused_reason,
    declineReason: w.decline_reason,
    waitingDays: w.waiting_days,
    school: w.first_school
      ? { name: w.first_school.name, country: w.first_school.country ?? null }
      : null,
    completed: w.completed_sessions,
    upcoming: w.upcoming_sessions,
    showUpRate: w.show_up_rate,
    showUpTier: toTier(w.show_up_tier),
  };
}

export type AdminEducation = EducationRow & { country: string | null; current: boolean };

const yearOf = (d: string | null | undefined) => d?.slice(0, 4) || null;

/**
 * A saved degree (the /me EducationRead) as the drawer lists it. Not Settings'
 * `rowOf`: that reads the editor's EducationEntry (picked chip, level id),
 * which this read-only view never builds.
 */
export function toAdminEducation(e: EducationRead): AdminEducation {
  return {
    id: e.id,
    degree: e.degree_abbreviation || e.degree_level?.display_name || null,
    course: e.study_course ?? '',
    school: e.institution?.name || e.school_name_raw,
    country: e.institution?.country?.display_name ?? null,
    start: yearOf(e.date_start),
    end: yearOf(e.date_end),
    current: e.is_most_recent && !e.date_end,
  };
}

export type AdminBooking = {
  id: string;
  /** Full name, or "Deleted user". */
  mentee: string;
  menteeFirstName: string;
  startsAt: string;
  outcome: BookingOutcome;
};

/** The drawer (A4). */
export type AdminMentorDetail = AdminPerson & {
  handle: string | null;
  email: string;
  /** Which tab they sit in. */
  status: MentorTab;
  submittedAt: string | null;
  approvedAt: string | null;
  decidedAt: string | null;
  linkedinUrl: string | null;
  timeZone: string | null;
  headline: string | null;
  about: string | null;
  education: AdminEducation[];
  helpAreas: string[];
  /** "Mon, Wed, 6:00 pm – 9:00 pm", one per group of days, in `hoursZone`. */
  hours: string[];
  hoursZone: string | null;
  stats: {
    completed: number;
    upcoming: number;
    missedByMentor: number;
    showUpRate: number | null;
    showUpTier: ShowUpTier | null;
  };
  recentBookings: AdminBooking[];
  /** Kept whenever the API sends it, so `by` is never lost; `at` may be unknown. */
  paused: { at: string | null; by: 'admin' | 'mentor'; reason: string | null } | null;
  declined: { at: string | null; reason: string | null } | null;
};

export function toAdminMentorDetail(w: WireMentorDetail): AdminMentorDetail {
  const rules = w.weekly_hours.filter((r) => r.is_active);
  const week = rules.length ? toWeeklyHours(rules, w.timezone ?? 'UTC') : null;
  return {
    ...toAdminPerson(w, w.email),
    handle: w.handle,
    email: w.email,
    status: TAB_OF[w.status],
    submittedAt: w.submitted_at,
    approvedAt: w.approved_at,
    decidedAt: w.decided_at,
    // Someone else's text on our page: https on LinkedIn's own host, else no link.
    linkedinUrl: safeSocialUrl('linkedin', w.linkedin_url),
    timeZone: w.timezone || null,
    headline: w.headline?.trim() || null,
    about: w.about?.trim() || null,
    education: w.education.map(toAdminEducation),
    helpAreas: w.help_areas.map((o) => o.display_name),
    hours: week ? weeklyHoursLines(week.days) : [],
    hoursZone: week?.timeZone ?? null,
    stats: {
      completed: w.stats.completed,
      upcoming: w.stats.upcoming,
      missedByMentor: w.stats.missed_by_mentor,
      showUpRate: w.stats.show_up_rate,
      showUpTier: toTier(w.stats.show_up_tier),
    },
    recentBookings: w.recent_bookings.slice(0, 5).map((b) => {
      const first = b.mentee_first_name?.trim() ?? '';
      const name = [first, b.mentee_last_name?.trim()].filter(Boolean).join(' ');
      return {
        id: b.id,
        mentee: name || DELETED_NAME,
        menteeFirstName: first || name.split(' ')[0] || '',
        startsAt: b.starts_at,
        outcome: b.outcome,
      };
    }),
    paused: w.paused ? { at: w.paused.at, by: w.paused.by, reason: w.paused.reason } : null,
    declined: w.declined ? { at: w.declined.at, reason: w.declined.reason } : null,
  };
}

export type AdminNote = { id: string; body: string; createdAt: string; author: AdminPerson };

export const toAdminNote = (n: WireAdminNote): AdminNote => ({
  id: n.id,
  body: n.body,
  createdAt: n.created_at,
  author: toAdminPerson(n.author),
});

const me = (adminId: string | null) => adminId ?? 'none';

/**
 * GET /admin/mentors?tab=: the whole tab. Search, filters and sort run in the
 * browser on it (PRD: volumes are small).
 */
export function useAdminMentors(adminId: string | null, tab: MentorTab) {
  return useQuery({
    queryKey: keys.admin.mentors(me(adminId), tab),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/admin/mentors', {
        params: { query: { tab: WIRE_TAB[tab] } },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return data.data.map(toAdminMentorRow);
    },
    enabled: adminId !== null,
    retry: retryOnce,
  });
}

/** GET /admin/mentors/{user_id}: the drawer. */
export function useAdminMentor(adminId: string | null, id: string | null) {
  return useQuery({
    queryKey: keys.admin.mentor(me(adminId), id ?? ''),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/admin/mentors/{user_id}', {
        params: { path: { user_id: id! } },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return toAdminMentorDetail(data);
    },
    enabled: adminId !== null && !!id,
    retry: retryOnce,
  });
}

/** GET /admin/mentors/{user_id}/notes, oldest first. Every admin may read them. */
export function useAdminNotes(adminId: string | null, id: string | null) {
  return useQuery({
    queryKey: keys.admin.notes(me(adminId), id ?? ''),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/admin/mentors/{user_id}/notes', {
        params: { path: { user_id: id! } },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return data.data.map(toAdminNote);
    },
    enabled: adminId !== null && !!id,
    retry: retryOnce,
  });
}

/**
 * Every admin write: the summary, every tab and the drawer refetch
 * (keys.admin) once it settles, failed or not. A refusal (404, 409) or a
 * timeout often means the row moved meanwhile, and the stale one must go.
 */
function useAdminWrite<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation<R, unknown, V>({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.admin.all }),
  });
}

/** Resuming a mentor who paused themselves: only they can (A8, 409). */
export const isSelfPausedError = (e: unknown) =>
  e instanceof ApiError && e.status === 409 && e.type === '/problems/mentor-paused-themselves';

async function ensure(res: { error?: unknown; response: Response }) {
  if (!res.response.ok) throw apiError(res.response.status, res.error, res.response);
}

/** POST /admin/mentors/{user_id}/notes (1–2,000 characters; never limited_access). */
export function useAddAdminNote(mentorId: string | null) {
  return useAdminWrite(async (body: string) => {
    if (!mentorId) throw new ApiError(0);
    const res = await api.POST('/api/v1/admin/mentors/{user_id}/notes', {
      params: { path: { user_id: mentorId } },
      body: { body },
    });
    if (!res.response.ok || !res.data) throw apiError(res.response.status, res.error, res.response);
    return toAdminNote(res.data);
  });
}

const decide = async (id: string, approve: boolean, reason?: string) =>
  ensure(
    await api.POST('/api/v1/admin/mentors/{user_id}/decision', {
      params: { path: { user_id: id }, query: { approve } },
      body: approve ? {} : { reason },
    }),
  );

/** POST /admin/mentors/{user_id}/decision?approve=true: approved and listed, emailed. */
export const useApproveMentor = () => useAdminWrite((id: string) => decide(id, true));

/** The same call with approve=false; the UI always sends the comment (PRD). */
export const useDeclineMentor = () =>
  useAdminWrite(({ id, reason }: { id: string; reason: string }) => decide(id, false, reason));

const listing = async (id: string, listed: boolean, reason?: string) =>
  ensure(
    await api.POST('/api/v1/admin/mentors/{user_id}/listing', {
      params: { path: { user_id: id }, query: { listed } },
      body: listed ? {} : { reason },
    }),
  );

/** Unlist with the admins-only reason (422 without one; emails the mentor). */
export const usePauseMentor = () =>
  useAdminWrite(({ id, reason }: { id: string; reason: string }) => listing(id, false, reason));

/**
 * List again. Never offered for a mentor who paused themselves: the API
 * answers 409 `/problems/mentor-paused-themselves`.
 */
export const useResumeMentor = () => useAdminWrite((id: string) => listing(id, true));

/** The approvals call takes at most this many ids. */
export const BULK_MAX = 50;

/**
 * POST /admin/mentors/approvals, 50 ids a call: each mentor is its own
 * transaction, the answers merged. A call that fails after an earlier one
 * went through still rejects; the refetch on settle shows who was approved.
 */
export const useBulkApprove = () =>
  useAdminWrite(async (ids: string[]): Promise<BulkDecision> => {
    const out: BulkDecision = { approved: [], failed: [] };
    for (let i = 0; i < ids.length; i += BULK_MAX) {
      const res = await api.POST('/api/v1/admin/mentors/approvals', {
        body: { user_ids: ids.slice(i, i + BULK_MAX) },
      });
      if (!res.response.ok || !res.data)
        throw apiError(res.response.status, res.error, res.response);
      out.approved.push(...res.data.approved);
      out.failed.push(...res.data.failed);
    }
    return out;
  });
