import { NextResponse } from 'next/server';
import { ok, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of PUT /api/v1/me/consents/analytics (PRD 30): the answer back with
 * the time it was given. Keeps nothing (the mock viewers never call /me), so
 * the device's cookie is what a reload reads. ENABLE_MOCK_API=1 only.
 */
export async function PUT(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    granted?: unknown;
    version?: unknown;
  } | null;
  if (typeof body?.granted !== 'boolean' || typeof body.version !== 'string' || !body.version)
    return problem(422, { title: 'Unprocessable Content' });
  await new Promise((r) => setTimeout(r, 120));
  return ok('/api/v1/me/consents/analytics', 'put', {
    granted: body.granted,
    version: body.version,
    answered_at: new Date().toISOString(),
  });
}
