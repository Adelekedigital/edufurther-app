import { NextResponse } from 'next/server';
import { startPreview } from '@/lib/api/mock/previewSessions';
import { ok, problem } from '@/lib/api/mock/respond';

/** MOCK of POST /api/v1/admin/preview-sessions (backend PR 1). ENABLE_MOCK_API=1 only. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { user_id?: string; email?: string };
  const s = startPreview(body);
  if (!s) {
    return problem(404, { type: '/problems/preview-user-not-found', title: 'Not found' });
  }
  return ok('/api/v1/admin/preview-sessions', 'post', s, { status: 201 });
}
