import { NextResponse } from 'next/server';
import {
  isMockSection,
  mockSection,
  mockWindow,
  type MockQuery,
} from '@/lib/api/mock/adminAnalytics';
import { ok, pendingOk, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/admin/analytics/{overview|sessions|supply|credits|growth}
 * (PRD 31, PENDING BACKEND). ENABLE_MOCK_API=1 only.
 */
export async function GET(req: Request, { params }: { params: Promise<{ section: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const { section } = await params;
  const q = Object.fromEntries(new URL(req.url).searchParams) as MockQuery;
  const c = mockWindow(q);
  if (!c) return problem(422, { type: '/problems/analytics-window', title: 'Invalid window' });
  if (!isMockSection(section)) return problem(404, { title: 'Not found' });
  switch (section) {
    case 'overview':
      return pendingOk('GET /api/v1/admin/analytics/overview', mockSection('overview', c));
    case 'sessions':
      return pendingOk('GET /api/v1/admin/analytics/sessions', mockSection('sessions', c));
    case 'supply':
      return pendingOk('GET /api/v1/admin/analytics/supply', mockSection('supply', c));
    case 'credits':
      return ok('/api/v1/admin/analytics/credits', 'get', mockSection('credits', c));
    case 'growth':
      return pendingOk('GET /api/v1/admin/analytics/growth', mockSection('growth', c));
  }
}
