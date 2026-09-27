import { NextResponse, type NextRequest } from 'next/server';
import { MENTORS } from '@/lib/api/mock/fixtures';
import { MOCK_SESSION_TYPES, mockSlots } from '@/lib/api/mock/availability';

const DAY = 24 * 60 * 60 * 1000;
const problem = (status: number, title: string, type = 'about:blank') =>
  NextResponse.json(
    { type, title, status },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

/**
 * MOCK of POST /api/v1/sessions. Mirrors the contract's refusals: no
 * Idempotency-Key or an instant the grid doesn't offer → 422. The mock can't
 * know the mentor from the offering (every mock mentor shares the two
 * offerings), so it accepts an instant any mentor offers. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: NextRequest) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  if (!req.headers.get('idempotency-key')) return problem(422, 'Idempotency-Key is required');
  const body = (await req.json().catch(() => null)) as {
    session_type_id?: string;
    starts_at?: string;
  } | null;
  const type = MOCK_SESSION_TYPES.find((t) => t.id === body?.session_type_id);
  if (!type || !body?.starts_at) return problem(422, 'Unprocessable Content');
  const now = Date.now();
  const offered = MENTORS.some((m) =>
    mockSlots(m.id, type.id, now + 56 * DAY, now).some(
      (s) => Date.parse(s.start) === Date.parse(body.starts_at!),
    ),
  );
  if (!offered) return problem(422, 'That instant is not offered');
  await new Promise((r) => setTimeout(r, 600));
  return NextResponse.json(
    {
      id: `bk-${now}`,
      session_type_id: type.id,
      status: 'pending',
      starts_at: body.starts_at,
      duration_minutes: type.duration_minutes,
    },
    { status: 201 },
  );
}
