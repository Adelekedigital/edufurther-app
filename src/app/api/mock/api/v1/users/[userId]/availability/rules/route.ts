import { NextResponse } from 'next/server';
import { addRule, rules } from '@/lib/api/mock/bookingPrefs';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/users/{id}/availability/rules. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return ok('/api/v1/users/{user_id}/availability/rules', 'get', rules);
}

/** MOCK of POST /api/v1/users/{id}/availability/rules: 422 bad times, 409 overlap. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 150));
  const r = addRule(body);
  return r.ok
    ? ok('/api/v1/users/{user_id}/availability/rules', 'post', r.body, { status: r.status })
    : problem(r.status, r.problem);
}
