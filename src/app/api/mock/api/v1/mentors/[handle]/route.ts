import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import {
  MOCK_SESSION_TYPES,
  mockAvailabilityState,
  mockNextAvailableAt,
} from '@/lib/api/mock/availability';
import { FEATURED, MENTORS } from '@/lib/api/mock/fixtures';

type MentorPublicRead = components['schemas']['MentorPublicRead'];

const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'Cameroon', 'Nigeria'];
const STUDY = ['United States', 'United Kingdom', 'Canada', 'Germany'];

/**
 * MOCK of GET /api/v1/mentors/{handle} (slug or id) → MentorPublicRead, built
 * from the list fixtures. Every third generated mentor is sparse (no about, no
 * awards, no background) and mentors with no sessions read as new, so the
 * profile's empty branches have data to render. Unknown handles 404, as do
 * the design's fully booked sample, which reads as hidden. ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ handle: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { handle } = await ctx.params;
  const all = [FEATURED, ...MENTORS];
  const i = all.findIndex((m) => m.id === handle || m.slug === handle);
  const m = all[i];
  if (!m) return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));

  const sparse = i > 5 && i % 3 === 2;
  const sessions = m.completed_sessions;
  const hidden = mockAvailabilityState(m.id) === 'none';
  const body: MentorPublicRead = {
    id: m.id,
    slug: m.slug,
    first_name: m.first_name,
    last_name: m.last_name,
    timezone: 'America/Chicago',
    headline: [m.degree && m.study_course ? `${m.degree} ${m.study_course}` : null, m.institution]
      .filter(Boolean)
      .join(' · '),
    about_me: sparse
      ? null
      : `I moved abroad for my ${m.degree ?? 'degree'} at ${m.institution} and have reviewed dozens of statements since. I’ll help you shortlist programs that fund, tell a clear story in your statement, and prepare for visa and admissions interviews. Past failures taught me as much as the wins, and I bring both to every session.`,
    avatar_url: m.avatar_url,
    avatar_focus: m.avatar_focus,
    banner_url: null,
    primary_study_program: m.study_course,
    primary_study_country: sparse ? null : STUDY[i % STUDY.length]!,
    origin_country: sparse ? null : COUNTRIES[i % COUNTRIES.length]!,
    social_linkedin: sparse ? null : `https://www.linkedin.com/in/${m.slug}`,
    social_twitter: null,
    social_youtube: i % 4 === 0 ? `https://www.youtube.com/@${m.slug}` : null,
    offerings: m.offerings,
    session_types: hidden
      ? []
      : MOCK_SESSION_TYPES.map((t, k) => ({
          ...t,
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
    attendance_rate: sessions > 0 ? 88 : null,
    reviews: {
      count: m.review_count,
      session_value: m.session_value,
      recommended_percent: m.review_count ? 90 : null,
    },
    languages: sparse
      ? []
      : [
          { id: 'en', display_name: 'English', code: 'en' },
          { id: 'yo', display_name: 'Yoruba', code: 'yo' },
        ],
    next_available_at: mockNextAvailableAt(m.id),
    next_available_state: mockAvailabilityState(m.id),
  };
  return NextResponse.json(body);
}
