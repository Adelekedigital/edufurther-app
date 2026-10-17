import { NextResponse } from 'next/server';
import { MOCK_COUNTRIES, mockItems } from '@/lib/api/mock/catalog';
import { ok } from '@/lib/api/mock/respond';
import {
  MOCK_VIEWER_ID,
  mockGoal,
  mockMissing,
  mockProgress,
} from '@/lib/api/mock/onboardingStore';

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

export async function GET() {
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
    profile: {
      cover_art: 'none' as const,
      origin_country: originRef(mockItems(MOCK_VIEWER_ID).origin_country_id ?? null),
    },
    // Complete once completion has run (PRD B3), not merely when nothing is missing.
    onboarding: { complete: !!mockProgress(MOCK_VIEWER_ID)?.completed_at, missing },
  };
  return ok('/api/v1/me', 'get', me);
}
