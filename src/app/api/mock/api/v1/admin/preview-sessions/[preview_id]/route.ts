import { NextResponse } from 'next/server';
import { getPreview, switchPreview } from '@/lib/api/mock/previewSessions';
import { ok } from '@/lib/api/mock/respond';

type Ctx = { params: Promise<{ preview_id: string }> };
const P = '/api/v1/admin/preview-sessions/{preview_id}' as const;

/** MOCK of GET /api/v1/admin/preview-sessions/{id} (backend PR 1). ENABLE_MOCK_API=1 only. */
export async function GET(_req: Request, { params }: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const s = getPreview((await params).preview_id);
  return s ? ok(P, 'get', s) : new NextResponse(null, { status: 404 });
}

/** MOCK of PATCH /{id} {user_id}: switch, reveals reset. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { user_id?: string };
  const s = switchPreview((await params).preview_id, body.user_id ?? '');
  return s ? ok(P, 'patch', s) : new NextResponse(null, { status: 404 });
}
