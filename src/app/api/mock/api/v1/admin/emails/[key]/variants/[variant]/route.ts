import { NextResponse } from 'next/server';
import type { WireEmailSave } from '@/lib/api/data/adminEmails';
import { mockSaveEmailVariant } from '@/lib/api/mock/adminEmails';
import { ok, problem } from '@/lib/api/mock/respond';

/**
 * MOCK of PUT /api/v1/admin/emails/{key}/variants/{variant} (PRD 28): the rules, the version check (409), Not set up (423), then the
 * write. ENABLE_MOCK_API=1 only.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string; variant: string }> },
) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 400));
  const { key, variant } = await params;
  const r = mockSaveEmailVariant(key, variant, (await req.json()) as WireEmailSave);
  if (!r.ok) return problem(r.status, r.problem);
  return ok('/api/v1/admin/emails/{key}/variants/{variant}', 'put', r.body);
}
