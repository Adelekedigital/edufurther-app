import { NextResponse } from 'next/server';
import { addRule, rules } from '@/lib/api/mock/bookingPrefs';

/** MOCK of GET /api/v1/users/{id}/availability/rules. ENABLE_MOCK_API=1 only. */
export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  return NextResponse.json(rules);
}

/** MOCK of POST /api/v1/users/{id}/availability/rules: 422 bad times, 409 overlap. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await new Promise((r) => setTimeout(r, 150));
  const r = addRule(body);
  const headers: Record<string, string> =
    r.status === 201 ? {} : { 'content-type': 'application/problem+json' };
  return NextResponse.json(r.json, { status: r.status, headers });
}
