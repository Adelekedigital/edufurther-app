import { NextResponse } from 'next/server';
import type { components } from '@/lib/api/generated/schema';
import { grantCredits } from '@/lib/api/mock/adminCredits';
import { ok, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of POST /api/v1/admin/credits: grants land in the mock's ledger, so the
 * balance, history and log move. Idempotency-Key required. ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  const key = req.headers.get('Idempotency-Key');
  if (!key) return problem(422, { title: 'Idempotency-Key is required' });
  const body = (await req.json().catch(() => null)) as
    components['schemas']['AdminCreditGrantWrite'] | null;
  const res = body && grantCredits(key, body);
  if (!res) return problem(422, { title: 'Validation failed' });
  return ok('/api/v1/admin/credits', 'post', res);
}
