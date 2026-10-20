import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import { addMockLink, mockLinks } from '@/lib/api/mock/linksStore';
import { ok, problem } from '@/lib/api/mock/respond';

const PLATFORMS = ['x', 'youtube', 'instagram', 'facebook', 'tiktok', 'website'] as const;

/** MOCK of GET /api/v1/me/links (backend #507): the viewer's links in their order, one page. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  return ok('/api/v1/me/links', 'get', { data: mockLinks() });
}

/**
 * MOCK of POST /api/v1/me/links: 201 with the link; 409 for a second link on
 * a platform or a fourth website; 422 at /value. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  const body = (await req.json().catch(() => null)) as Partial<
    components['schemas']['LinkCreate']
  > | null;
  const platform = PLATFORMS.find((p) => p === body?.platform);
  if (!platform || typeof body?.value !== 'string')
    return problem(422, { title: 'Validation failed', errors: [{ pointer: '/platform' }] });
  const r = addMockLink(platform, body.value);
  if (!r.ok)
    return r.status === 422
      ? problem(422, { title: 'Validation failed', errors: [{ pointer: '/value' }] })
      : problem(409, { type: r.type, title: 'Conflict' });
  return ok('/api/v1/me/links', 'post', r.link, { status: 201 });
}
