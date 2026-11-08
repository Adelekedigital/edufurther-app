import { NextResponse } from 'next/server';
import { searchPreviewUsers } from '@/lib/api/mock/previewSessions';
import { ok } from '@/lib/api/mock/respond';

/** MOCK of GET /api/v1/admin/users (Preview as user, backend PR 3). ENABLE_MOCK_API=1 only. */
export async function GET(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 250));
  const p = new URL(req.url).searchParams;
  const body = searchPreviewUsers(p.get('q') ?? '', p.get('role') ?? 'all', p.get('cursor'));
  return ok('/api/v1/admin/users', 'get', body);
}
