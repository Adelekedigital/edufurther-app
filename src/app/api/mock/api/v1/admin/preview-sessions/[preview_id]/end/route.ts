import { NextResponse } from 'next/server';
import { endPreview } from '@/lib/api/mock/previewSessions';

type Ctx = { params: Promise<{ preview_id: string }> };

/** MOCK of POST /api/v1/admin/preview-sessions/{id}/end (backend PR 1). ENABLE_MOCK_API=1 only. */
export async function POST(req: Request, { params }: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = body.reason === 'sign_out' ? 'sign_out' : 'exit';
  const done = endPreview((await params).preview_id, reason);
  return new NextResponse(null, { status: done ? 204 : 404 });
}
