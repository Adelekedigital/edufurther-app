'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { coverArt, coverKey } from '@/lib/utils/cover';
import { stageText } from '@/lib/utils/stageText';
import { markOf } from '@/lib/utils/socialLinks';
import { safeSocialUrl } from '@/lib/utils/socialUrl';
import type {
  Completeness,
  CompletenessCode,
  Mentor,
  MentorProfile,
  ReviewSummary,
  AwardItem,
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
import { clampFocus, personCover, personInitials } from '@/lib/utils/person';
import { nextAvailable } from './mentors';
import { sessionKey, useSession } from './session';
import { stagesOf } from './sessionTypes';

type MentorPublicRead = components['schemas']['MentorPublicRead'];
type SessionTypeRead = components['schemas']['SessionTypeRead'];
type ApplicationStage = components['schemas']['ApplicationStage'];

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
    // Backend #522: the topic filter chips, each with the total its filter pages through.
    topics: (r?.review_topics ?? [])
      .filter((t) => t.slug && t.count > 0)
      .map((t) => ({ slug: t.slug, name: t.display_name, count: t.count })),
  };
}

function year(date: string | null | undefined): string | null {
  return date ? date.slice(0, 4) : null;
}

/**
 * Every stage the offering is aimed at, in the mentor's order: "Drafting,
 * Revising". `other` reads as the mentor's own wording. Empty means any stage,
 * so no chip. Falls back to the deprecated single `application_stage` while
 * a response still lacks the list (backend round 3).
 */
export function stageLine(r: SessionTypeRead): string | null {
  return stageText(stagesOf(r));
}

function toProfileSessionType(r: SessionTypeRead): ProfileSessionType {
  const stage = stageLine(r);
  return {
    ...toSessionType(r),
    // The first of `service_offerings`, not the single `service_offering` the
    // backend is removing (their #274). This one mattered: unlike the fallbacks
    // elsewhere, there was nothing behind it, so the day the field went the
    // category line would have stopped rendering with nothing thrown, nothing
    // logged and CI green.
    category: r.service_offerings?.[0]?.display_name ?? null,
    stage,
    // Backend #526: this offering's own next time, the same mapper as the mentor's.
    ...nextAvailable(r.next_available_state, r.next_available_at),
  };
}

export function toMentorProfile(r: MentorPublicRead): MentorProfile {
  const first = r.first_name?.trim() || '';
  const last = r.last_name?.trim() || '';
  const name = [first, last].filter(Boolean).join(' ') || 'EduFurther mentor';
  const latest = r.education?.[0];
  const reviewCount = r.reviews?.count ?? 0;
  const rating = r.reviews?.session_value ?? null;

  const mentor: Mentor = {
    id: r.id,
    profileHref: `/mentors/${encodeURIComponent(r.slug || r.id)}`,
    name,
    firstName: first || name.split(' ')[0] || name,
    initials: personInitials(first, last, name),
    photoUrl: r.avatar_url ?? null,
    photoFocus: clampFocus(r.avatar_focus),
    cover: personCover(r.id, coverKey(r.cover_color)),
    degreeLine: [latest?.degree, latest?.study_course].filter(Boolean).join(', ') || null,
    institution: latest?.institution ?? null,
    completedSessions: r.completed_sessions,
    reviewCount,
    rating,
    label: deriveLabel({ rating, reviewCount, completedSessions: r.completed_sessions }),
    // PRODUCT RULE (2026-09-27): every session is free until paid sessions ship.
    offer: 'free',
    ...nextAvailable(r.next_available_state, r.next_available_at),
    takingBookings: r.taking_bookings ?? true,
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

  const awards: AwardItem[] = (r.scholarships ?? []).map((a) => {
    // Null when the mentor hasn't said, which is most awards (backend).
    const funding = a.funding === 'full' || a.funding === 'partial' ? a.funding : null;
    return {
      id: a.id,
      title: a.title,
      meta: [a.institution, a.year ? String(a.year) : null].filter(Boolean).join(' · ') || null,
      funding,
      values: { title: a.title, org: a.institution, year: a.year ?? null, funding },
    };
  });

  // LinkedIn first (it stays `social_linkedin`), then their links in their
  // order (backend #507: sorted by position). Each checked before it renders.
  const socials = (
    [['linkedin', r.social_linkedin], ...(r.links ?? []).map((l) => [l.platform, l.url])] as [
      SocialKind,
      string | null | undefined,
    ][]
  ).flatMap(([kind, v]) => {
    const href = safeSocialUrl(kind, v);
    return href ? [{ mark: markOf(kind, href), href }] : [];
  });

  // approval_status / listing_status are *absent* for everyone but the owner
  // (mentor-profile reply #1), so their presence is what says "this is you".
  const isOwner = 'approval_status' in r || 'listing_status' in r;

  const profile: MentorProfile = {
    mentor,
    names: { first, last },
    // Backend #301: approved, listed and bookable now. Missing reads as true.
    takingBookings: r.taking_bookings ?? true,
    headline: r.headline?.trim() || null,
    about: r.about_me?.trim() || null,
    // Still the untouched AI draft (owner-only on the read, backend #8).
    aboutDrafted: !!r.about_me_drafted_at,
    bannerUrl: r.banner_url ?? null,
    // Checked against our 12 keys: an unknown value falls back to the automatic cover.
    cover: { color: coverKey(r.cover_color), art: coverArt(r.cover_art) },
    originCountry: r.origin_country ?? null,
    studyCountry: r.primary_study_country ?? null,
    languages: (r.languages ?? []).map((l) => l.display_name),
    // Ids, not names: names aren't unique in the catalog (backend reply).
    background: {
      originId: r.origin_country_id ?? null,
      studyId: r.primary_study_country_id ?? null,
      languages: (r.languages ?? []).map((l) => ({ id: l.id, label: l.display_name })),
    },
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
      ? {
          approval: r.approval_status ?? null,
          listed: r.listing_status !== 'unlisted',
          setupNeeded: r.setup_needed ?? [],
        }
      : null,
  };
  if (profile.owner) profile.owner.completeness = toCompleteness(r);
  return profile;
}

const COMPLETENESS_CODES: readonly string[] = [
  'session_type',
  'weekly_hours',
  'photo',
  'headline',
  'about',
  'topics',
  'background',
  'education',
  'award',
] satisfies CompletenessCode[];

/**
 * Profile strength (Mentor Profile.dc.html `canEdit` aside): the owner-only
 * `completeness` (backend #317; the backend owns the rule and the order).
 * Codes we don't know are skipped: more may come. None sent, no card.
 */
export function toCompleteness(r: MentorPublicRead): Completeness | undefined {
  const c = r.completeness;
  if (!c) return undefined;
  return {
    percent: Math.max(0, Math.min(100, Math.round(c.percent))),
    missing: c.missing.filter((m): m is CompletenessCode => COMPLETENESS_CODES.includes(m)),
  };
}

// ---- hook -------------------------------------------------------------------

/**
 * GET /api/v1/mentors/{handle} (slug or id). 404 is "not found or not public",
 * indistinguishable on purpose — the screen says so without guessing which.
 * The owner gets their page in any state, so the key carries the session.
 */
export function useMentorProfile(
  handle: string | null,
): Remote<MentorProfile> & { notFound: boolean; updatedAt: number } {
  const session = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: keys.mentors.profile(handle ?? '', sessionKey(session)),
    // Wait for the session: the owner's view differs from a stranger's. No
    // handle (a caller with no mentor to show): no request.
    enabled: session.status !== 'unknown' && !!handle,
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/mentors/{handle}', {
        params: { path: { handle: handle! } },
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
    /** When the read last landed (0: never), so a caller can tell a refetch from the same data. */
    updatedAt: query.dataUpdatedAt,
  };
}
