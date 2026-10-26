import { NextResponse } from 'next/server';
import { ok, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of POST /api/v1/me/referrals/claim: a new account claims the invite it
 * arrived with. The sample link (`damilola-7k2x`) claims; `claimed-…` is
 * somebody else's (409); anything else is unknown (404). ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code : '';
  await new Promise((r) => setTimeout(r, 140));
  if (!code || code.length > 128) return problem(422, { title: 'Validation failed' });
  if (code.startsWith('claimed-')) return problem(409, { title: 'Invite already claimed' });
  if (code.toLowerCase() !== 'damilola-7k2x')
    return problem(404, { title: 'No invite carries that code' });
  return ok('/api/v1/me/referrals/claim', 'post', {
    id: '00000000-0000-4000-8000-0000000000b1',
    code: 'damilola-7k2x-a1',
    invited_at: new Date().toISOString(),
    signed_up_at: new Date().toISOString(),
  });
}
