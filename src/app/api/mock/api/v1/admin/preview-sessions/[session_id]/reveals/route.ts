import { NextResponse } from 'next/server';
import { revealPreview } from '@/lib/api/mock/previewSessions';
import { ok, problem } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ session_id: string }> };

/** MOCK of POST /api/v1/admin/preview-sessions/{id}/reveals {reason} (backend PR 5). */
export async function POST(req: Request, { params }: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 300));
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? '').trim();
  if (reason.length < 1 || reason.length > 500) return problem(422, { title: 'Validation failed' });
  const s = revealPreview((await params).session_id);
  return s
    ? ok('/api/v1/admin/preview-sessions/{session_id}/reveals', 'post', s)
    : problem(404, { title: 'Not found' });
}
