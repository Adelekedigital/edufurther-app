import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import {
  MOCK_SESSION_TYPES,
  mockAvailabilityState,
  mockNextAvailableAt,
} from '@/lib/api/mock/availability';
import { FEATURED, MENTORS, mockCountries, mockProfileIndex } from '@/lib/api/mock/fixtures';
import { prefs } from '@/lib/api/mock/bookingPrefs';
import { mockBannerUrl, mockCover } from '@/lib/api/mock/coverStore';
import { mockText } from '@/lib/api/mock/profileTextStore';
import { mockReviewSummary } from '@/lib/api/mock/reviews';

type MentorPublicRead = components['schemas']['MentorPublicRead'];

/**
 * MOCK of GET /api/v1/mentors/{handle} (slug or id) → MentorPublicRead, built
 * from the list fixtures. Every third generated mentor is sparse (no headline,
 * no about, no awards, no background) and mentors with no sessions read as new, so the
 * profile's empty branches have data to render. Unknown handles 404. The
 * design's fully booked sample is public with its offerings and reads
 * next_available_state "none" ("No open times at the moment"). The mock mentor
 * viewer's own id, `mock-mentor`, answers with the featured mentor's data, so
 * the owner's tools can be driven locally. ENABLE_MOCK_API=1 only.
 */
/** The mock mentor viewer's id (viewer.ts MOCK_VIEWERS.mentor). */
const OWNER_ID = 'mock-mentor';

export async function GET(_req: Request, ctx: { params: Promise<{ handle: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { handle } = await ctx.params;
  const all = [FEATURED, ...MENTORS];
  const own = handle === OWNER_ID;
  const i = own ? 0 : all.findIndex((m) => m.id === handle || m.slug === handle);
  const m = all[i];
  if (!m) return new NextResponse(null, { status: 404 });
  const id = own ? OWNER_ID : m.id;
  const cover = mockCover(id);
  await new Promise((r) => setTimeout(r, 250));

  const { sparse } = mockProfileIndex(m.id);
  const sessions = m.completed_sessions;
  const body: MentorPublicRead = {
    id,
    slug: own ? OWNER_ID : m.slug,
    first_name: m.first_name,
    last_name: m.last_name,
    timezone: 'America/Chicago',
    headline: sparse
      ? null
      : [m.degree && m.study_course ? `${m.degree} ${m.study_course}` : null, m.institution]
          .filter(Boolean)
          .join(' · '),
    about_me: sparse
      ? null
      : `I moved abroad for my ${m.degree ?? 'degree'} at ${m.institution} and have reviewed dozens of statements since. I’ll help you shortlist programs that fund, tell a clear story in your statement, and prepare for visa and admissions interviews. Past failures taught me as much as the wins, and I bring both to every session.`,
    avatar_url: m.avatar_url,
    avatar_focus: m.avatar_focus,
    banner_url: mockBannerUrl(id),
    primary_study_program: m.study_course,
    ...mockCountries(m.id),
    social_linkedin: sparse ? null : `https://www.linkedin.com/in/${m.slug}`,
    social_twitter: null,
    social_youtube: i % 4 === 0 ? `https://www.youtube.com/@${m.slug}` : null,
    offerings: m.offerings,
    session_types: MOCK_SESSION_TYPES.map((t, k) => ({
      ...t,
      // Backend round 3: the list, plus the deprecated first item.
      application_stages: k === 0 ? ['early_exploration'] : ['drafting_stage', 'revisions'],
      application_stage: k === 0 ? 'early_exploration' : 'drafting_stage',
      service_offering: m.offerings?.[k]
        ? { code: m.offerings[k]!.slug, display_name: m.offerings[k]!.display_name }
        : null,
    })),
    education: [
      {
        id: `${m.id}-e1`,
        degree: m.degree,
        study_course: m.study_course,
        institution: m.institution,
        date_start: '2023-08-15',
        date_end: '2027-05-15',
      },
    ],
    scholarships: sparse
      ? []
      : [
          {
            id: `${m.id}-a1`,
            title: 'Graduate Teaching Assistantship',
            institution: m.institution ?? '',
            year: 2023,
          },
        ],
    completed_sessions: sessions,
    mentoring_minutes: sessions * 60,
    mentees_mentored: Math.ceil(sessions / 2),
    // Null until a session has settled (backend); every fourth mentor has none
    // yet, so the track record's "No data yet" tile has data to render.
    attendance_rate: sessions > 0 && i % 4 !== 1 ? 88 : null,
    reviews: mockReviewSummary(m.id),
    languages: sparse
      ? []
      : [
          { id: 'en', display_name: 'English', code: 'en' },
          { id: 'yo', display_name: 'Yoruba', code: 'yo' },
        ],
    // Null whenever the mentor isn't taking bookings (backend #301).
    next_available_at: m.taking_bookings === false ? null : mockNextAvailableAt(m.id),
    next_available_state: m.taking_bookings === false ? 'none' : mockAvailabilityState(m.id),
    joined_at: m.joined_at,
    // Backend #19: null until chosen → the frontend's automatic cover.
    cover_color: cover.cover_color,
    cover_art: cover.cover_art,
    // Backend #301: approved, listed and bookable (fixtures' NOT_TAKING isn't).
    taking_bookings: m.taking_bookings !== false,
  };
  if (own) {
    // The owner's edits (PATCH /users/{id}/profile and /mentor-profile).
    const t = mockText(id);
    if (t.first_name) body.first_name = t.first_name;
    if (t.last_name) body.last_name = t.last_name;
    if ('about_me' in t) body.about_me = t.about_me ?? null;
    const saved = (prefs as { headline?: string | null }).headline;
    if (saved !== undefined) body.headline = saved?.trim() || null;
  }
  return NextResponse.json(body);
}
