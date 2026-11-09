import { NextResponse } from 'next/server';
import { mockEmailDetail } from '@/lib/api/mock/adminEmails';
import { pendingOk, problem } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/emails/{key} (PRD 28, PENDING BACKEND). ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 200));
  const email = mockEmailDetail((await params).key);
  if (!email) return problem(404, { type: '/problems/email-not-found', title: 'Email not found' });
  return pendingOk('GET /api/v1/admin/emails/{key}', email);
}
