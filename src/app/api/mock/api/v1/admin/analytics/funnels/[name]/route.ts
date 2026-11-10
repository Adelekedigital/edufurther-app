import { NextResponse } from 'next/server';
import { isMockFunnel, mockFunnel, mockWindow, type MockQuery } from '@/lib/api/mock/adminAnalytics';
import { pendingOk, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/admin/analytics/funnels/{name}?by= (PRD 31, PENDING
 * BACKEND). ENABLE_MOCK_API=1 only. MOCK_POSTHOG_DOWN=1 answers the PostHog 503.
 */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const { name } = await params;
  const sp = new URL(req.url).searchParams;
  const c = mockWindow(Object.fromEntries(sp) as MockQuery);
  if (!c) return problem(422, { type: '/problems/analytics-window', title: 'Invalid window' });
  if (!isMockFunnel(name)) return problem(404, { title: 'Not found' });
  if (process.env.MOCK_POSTHOG_DOWN === '1') {
    return problem(503, { type: '/problems/analytics-upstream', title: 'PostHog unavailable' });
  }
  return pendingOk('GET /api/v1/admin/analytics/funnels/{name}', mockFunnel(name, sp.get('by') ?? 'all', c));
}
