import { NextResponse } from 'next/server';
import {
  isMockSection,
  mockBehaviour,
  mockSection,
  mockWindow,
  type MockQuery,
} from '@/lib/api/mock/adminAnalytics';
import { ok, pendingOk, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/admin/analytics/{overview|sessions|supply|credits|growth}
 * and /behaviour (PRD 31; behaviour PENDING BACKEND). ENABLE_MOCK_API=1 only.
 * MOCK_POSTHOG_DOWN=1 answers Behaviour with the PostHog 503.
 */
export async function GET(req: Request, { params }: { params: Promise<{ section: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const { section } = await params;
  const q = Object.fromEntries(new URL(req.url).searchParams) as MockQuery;
  const c = mockWindow(q);
  if (!c) return problem(422, { type: '/problems/analytics-window', title: 'Invalid window' });
  if (section === 'behaviour') {
    if (process.env.MOCK_POSTHOG_DOWN === '1') {
      return problem(503, { type: '/problems/analytics-upstream', title: 'PostHog unavailable' });
    }
    return pendingOk('GET /api/v1/admin/analytics/behaviour', mockBehaviour(c));
  }
  if (!isMockSection(section)) return problem(404, { title: 'Not found' });
  switch (section) {
    case 'overview':
      return ok('/api/v1/admin/analytics/overview', 'get', mockSection('overview', c));
    case 'sessions':
      return ok('/api/v1/admin/analytics/sessions', 'get', mockSection('sessions', c));
    case 'supply':
      return ok('/api/v1/admin/analytics/supply', 'get', mockSection('supply', c));
    case 'credits':
      return ok('/api/v1/admin/analytics/credits', 'get', mockSection('credits', c));
    case 'growth':
      return ok('/api/v1/admin/analytics/growth', 'get', mockSection('growth', c));
  }
}
