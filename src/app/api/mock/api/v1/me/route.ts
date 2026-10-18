import { NextResponse } from 'next/server';
import { MOCK_COUNTRIES, mockItems } from '@/lib/api/mock/catalog';
import { ok } from '@/lib/api/mock/respond';
import {
  MOCK_VIEWER_ID,
  mockGoal,
  mockMissing,
  mockProgress,
} from '@/lib/api/mock/onboardingStore';
import {
  isMockApplicationState,
  mentorApplication,
  seed,
} from '@/lib/api/mock/mentorApplicationStore';

/**
 * MOCK of GET /api/v1/me for the mock mentee, as onboarding reads it: the
 * goal, plus `profile.origin_country` (backend #477) and `onboarding` (#5): lib/api/data/pending.ts and
 * `onboarding` (PENDING BACKEND #5, PRD H5). The app's viewer doesn't call
 * this in mock mode (NEXT_PUBLIC_MOCK_VIEWER). ENABLE_MOCK_API=1 only.
 */
const originRef = (id: string | null) => {
  const c = MOCK_COUNTRIES.find((x) => x.id === id);
  return c ? { code: c.code, display_name: c.display_name } : null;
};

/**
 * The mock applicant's mentor profile (Mentor Onboarding B2, edufurtherbe #492):
 * the page's `?mockApplication=` when its Referer has one, else the store.
 */
function mentorProfile(req: Request) {
  let asked: string | null = null;
  // An opaque or malformed Referer is normal (a privacy setting, a redirect).
  try {
    const referer = req.headers.get('referer');
    if (referer) asked = new URL(referer).searchParams.get('mockApplication');
  } catch {}
  const app = isMockApplicationState(asked) ? seed(asked) : mentorApplication.application;
  if (!app) return null;
  return {
    id: '00000000-0000-4000-8000-000000000001',
    headline: null,
    years_of_experience: null,
    listing_status: app.approval_status === 'approved' ? 'listed' : 'unlisted',
    paused_by_mentor: false,
    requires_booking_confirmation: false,
    max_booking_window_days: 56,
    default_booking_window_days: 56,
    primary_study_program: null,
    primary_study_country: null,
    offerings: [],
    ...app,
  };
}

export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const missing = mockMissing(MOCK_VIEWER_ID);
  const me = {
    id: MOCK_VIEWER_ID,
    email: 'ada@example.com',
    first_name: 'Ada',
    last_name: 'Obi',
    primary_role: 'mentee' as const,
    timezone: 'Africa/Lagos',
    created_at: '2026-10-17T09:00:00Z',
    is_admin: false,
    education: [],
    awards: [],
    mentee_completed_sessions: 0,
    mentee_cancel_refund_hours: 12,
    goal: mockGoal(MOCK_VIEWER_ID),
    mentor_profile: mentorProfile(req),
    profile: {
      cover_art: 'none' as const,
      origin_country: originRef(mockItems(MOCK_VIEWER_ID).origin_country_id ?? null),
    },
    // Complete once completion has run (PRD B3), not merely when nothing is missing.
    onboarding: {
      complete: !!mockProgress(MOCK_VIEWER_ID)?.completed_at,
      missing,
      last_step: mockProgress(MOCK_VIEWER_ID)?.last_step ?? null,
    },
  };
  return ok('/api/v1/me', 'get', me);
}
