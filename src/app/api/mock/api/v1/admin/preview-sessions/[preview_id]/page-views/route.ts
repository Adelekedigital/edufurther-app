import { NextResponse } from 'next/server';
import { getPreview } from '@/lib/api/mock/previewSessions';

type Ctx = { params: Promise<{ preview_id: string }> };

/** MOCK of POST /api/v1/admin/preview-sessions/{id}/page-views (backend PR 1). Logs nothing. */
export async function POST(_req: Request, { params }: Ctx) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: getPreview((await params).preview_id) ? 204 : 404 });
}
