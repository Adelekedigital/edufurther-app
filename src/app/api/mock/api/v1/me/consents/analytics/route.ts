import { NextResponse } from 'next/server';
import { methodFits, toConsentMethod } from '@/lib/analytics/consent';
import { ok, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of PUT /api/v1/me/consents/analytics (PRD 30): the answer back with
 * the time it was given. Keeps nothing (the mock viewers never call /me), so
 * the device's cookie is what a reload reads. Like the backend, a method it
 * doesn't know, or one that doesn't fit the answer, is a 422; none is stored
 * as null. ENABLE_MOCK_API=1 only.
 */
export async function PUT(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    granted?: unknown;
    version?: unknown;
    method?: unknown;
  } | null;
  if (typeof body?.granted !== 'boolean' || typeof body.version !== 'string' || !body.version)
    return problem(422, { title: 'Unprocessable Content' });
  const method = body.method == null ? null : toConsentMethod(body.method);
  if (body.method != null && (!method || !methodFits(method, body.granted)))
    return problem(422, { title: 'Unprocessable Content' });
  await new Promise((r) => setTimeout(r, 120));
  return ok('/api/v1/me/consents/analytics', 'put', {
    granted: body.granted,
    version: body.version,
    method,
    answered_at: new Date().toISOString(),
  });
}
