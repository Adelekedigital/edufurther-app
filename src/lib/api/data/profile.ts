'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { safeSocialUrl } from '@/lib/utils/socialUrl';
import type {
  Mentor,
  MentorProfile,
  ReviewSummary,
  ProfileItem,
  ProfileSessionType,
  Remote,
  SocialKind,
} from '@/types/mentor';
import { toSessionType } from './booking';
import { ApiError, apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { deriveLabel } from './labels';
import { nextAvailableState, toFocus, toneFor } from './mentors';
import { sessionKey, useSession } from './session';

type MentorPublicRead = components['schemas']['MentorPublicRead'];
type SessionTypeRead = components['schemas']['SessionTypeRead'];
type ApplicationStage = components['schemas']['ApplicationStage'];
type Venue = components['schemas']['ConferencingProvider'];

const STAGE: Record<ApplicationStage, string | null> = {
  early_exploration: 'Exploring',
  drafting_stage: 'Drafting',
  post_submission: 'After submitting',
  revisions: 'Revising',
  interviewing: 'Interviewing', // backend #10 (session-types reply), design stage chip
  other: null, // custom_stage_label carries it
};

const VENUE: Record<Venue, string> = {
  google_meet: 'Google Meet',
  daily: 'EduFurther video',
  custom: 'Video call',
};

// ---- mapping ----------------------------------------------------------------

type ReviewSummaryRead = components['schemas']['ReviewSummaryRead'];

/** A whole-number percentage (0–100), or null when not rated yet. */
function percent(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.round(Math.min(100, Math.max(0, v)))
    : null;
}

export function toReviewSummary(r: ReviewSummaryRead | undefined): ReviewSummary {
  const in10 = r?.would_recommend_in_10;
  return {
    count: r?.count ?? 0,
    rating: r?.session_value ?? null,
    // Backend #256: share scoring 8+ of 10, as "n in 10"; null hides the box.
    wouldRecommendIn10:
      typeof in10 === 'number' && Number.isFinite(in10)
        ? Math.round(Math.min(10, Math.max(0, in10)))
        : null,
    attributes: {
      communication: percent(r?.communication_rating?.percent),
      knowledge: percent(r?.knowledge_rating?.percent),
      support: percent(r?.support_rating?.percent),
      practicality: percent(r?.practicality_rating?.percent),
    },
  };
}

function year(date: string | null | undefined): string | null {
  return date ? date.slice(0, 4) : null;
}

function toProfileSessionType(r: SessionTypeRead): ProfileSessionType {
  const stage =
    r.application_stage === 'other'
      ? r.custom_stage_label?.trim() || null
      : r.application_stage
        ? STAGE[r.application_stage]
        : null;
  return {
    ...toSessionType(r),
    category: r.service_offering?.display_name ?? null,
    stage,
    venue: VENUE[r.meeting_venue] ?? 'Video call',
  };
}

export function toMentorProfile(r: MentorPublicRead): MentorProfile {
  const first = r.first_name?.trim() || '';
  const last = r.last_name?.trim() || '';
  const name = [first, last].filter(Boolean).join(' ') || 'EduFurther mentor';
  const initials =
    ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || name.slice(0, 1).toUpperCase();
  const latest = r.education?.[0];
  const reviewCount = r.reviews?.count ?? 0;
  const rating = r.reviews?.session_value ?? null;

  const mentor: Mentor = {
    id: r.id,
    profileHref: `/mentors/${encodeURIComponent(r.slug || r.id)}`,
    name,
    firstName: first || name.split(' ')[0] || name,
    initials,
    photoUrl: r.avatar_url ?? null,
    photoFocus: toFocus(r.avatar_focus),
    tone: toneFor(r.id),
    degreeLine: [latest?.degree, latest?.study_course].filter(Boolean).join(', ') || null,
    institution: latest?.institution ?? null,
    completedSessions: r.completed_sessions,
    reviewCount,
    rating,
    label: deriveLabel({ rating, reviewCount, completedSessions: r.completed_sessions }),
    // PRODUCT RULE (2026-09-27): every session is free until paid sessions ship.
    offer: 'free',
    nextAvailableAt: r.next_available_at ?? null,
    nextAvailableState: nextAvailableState(r.next_available_state, r.next_available_at),
    originCountry: r.origin_country ?? null,
    studyCountry: r.primary_study_country ?? null,
    topics: (r.offerings ?? []).map((o) => ({ slug: o.slug, label: o.display_name })),
  };

  const education: ProfileItem[] = (r.education ?? []).flatMap((e) => {
    const title = [e.degree, e.study_course].filter(Boolean).join(', ') || e.institution;
    if (!title) return [];
    const years = [year(e.date_start), year(e.date_end)].filter(Boolean).join(' – ');
    const meta = [title === e.institution ? null : e.institution, years || null]
      .filter(Boolean)
      .join(' · ');
    return [{ id: e.id, title, meta: meta || null }];
  });

  const awards: ProfileItem[] = (r.scholarships ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    meta: [a.institution, a.year ? String(a.year) : null].filter(Boolean).join(' · ') || null,
  }));

  const socials = (
    [
      ['linkedin', r.social_linkedin],
      ['x', r.social_twitter],
      ['youtube', r.social_youtube],
    ] as [SocialKind, string | null | undefined][]
  ).flatMap(([kind, v]) => {
    const href = safeSocialUrl(kind, v);
    return href ? [{ kind, href }] : [];
  });

  // approval_status / listing_status are *absent* for everyone but the owner
  // (mentor-profile reply #1), so their presence is what says "this is you".
  const isOwner = 'approval_status' in r || 'listing_status' in r;

  return {
    mentor,
    headline: r.headline?.trim() || null,
    about: r.about_me?.trim() || null,
    bannerUrl: r.banner_url ?? null,
    originCountry: r.origin_country ?? null,
    studyCountry: r.primary_study_country ?? null,
    languages: (r.languages ?? []).map((l) => l.display_name),
    socials,
    education,
    awards,
    sessionTypes: (r.session_types ?? []).map(toProfileSessionType),
    mentoringMinutes: r.mentoring_minutes,
    menteesMentored: r.mentees_mentored,
    // A whole-number percentage, 0–100; null (never 0) until a session has
    // settled (backend, mentor-profile request #13).
    attendanceRate: r.attendance_rate ?? null,
    reviews: toReviewSummary(r.reviews),
    owner: isOwner
      ? { approval: r.approval_status ?? null, listed: r.listing_status !== 'unlisted' }
      : null,
  };
}

// ---- hook -------------------------------------------------------------------

/**
 * GET /api/v1/mentors/{handle} (slug or id). 404 is "not found or not public",
 * indistinguishable on purpose — the screen says so without guessing which.
 * The owner gets their page in any state, so the key carries the session.
 */
export function useMentorProfile(handle: string): Remote<MentorProfile> & { notFound: boolean } {
  const session = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: keys.mentors.profile(handle, sessionKey(session)),
    // Wait for the session: the owner's view differs from a stranger's.
    enabled: session.status !== 'unknown',
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/mentors/{handle}', {
        params: { path: { handle } },
        signal,
      });
      if (!data) throw apiError(response.status, error);
      const profile = toMentorProfile(data);
      // The booking modal reads the same offerings; don't fetch them twice.
      queryClient.setQueryData(
        keys.booking.sessionTypes(profile.mentor.id),
        (data.session_types ?? []).map(toSessionType),
      );
      return profile;
    },
    // A 404 won't become a 200 by asking again.
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 1,
    staleTime: 60 * 1000,
  });
  const error = query.error ? normaliseError(query.error) : null;
  const notFound = error?.kind === 'notFound';
  return {
    data: query.data ?? null,
    isLoading: query.isPending,
    error: notFound ? null : error,
    notFound,
    retry: () => void query.refetch(),
  };
}
