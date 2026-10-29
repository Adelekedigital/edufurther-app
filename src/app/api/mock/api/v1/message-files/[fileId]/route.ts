import { NextResponse } from 'next/server';
import { MOCK_PDF } from '@/lib/api/mock/intakeFiles';
import { mockMessageFileType } from '@/lib/api/mock/messages';

/**
 * MOCK of GET /api/v1/message-files/{id} (backend Messages PR 2): the bytes as
 * an attachment. A file the mock never saw is a 404, as for a stranger.
 * ENABLE_MOCK_API=1 only.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { fileId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 250));
  const type = mockMessageFileType(fileId);
  if (!type) return new NextResponse(null, { status: 404 });
  return new NextResponse(type === 'application/pdf' ? MOCK_PDF : 'mock docx bytes', {
    headers: { 'content-type': type, 'content-disposition': 'attachment' },
  });
}
