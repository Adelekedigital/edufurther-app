import { NextResponse } from 'next/server';
import { MOCK_PDF as PDF } from '@/lib/api/mock/intakeFiles';

/**
 * MOCK of GET /api/v1/intake-files/{id}: the file's bytes. A real, if tiny,
 * one-page PDF, so the viewer's <object> has something to render rather than a
 * broken frame. ENABLE_MOCK_API=1 only.
 */

export async function GET(_req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { fileId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 250));
  if (fileId === 'f-gone') return new NextResponse(null, { status: 404 });
  const word = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPdf = fileId !== 'f-cv';
  return new NextResponse(isPdf ? PDF : 'mock docx bytes', {
    headers: { 'content-type': isPdf ? 'application/pdf' : word },
  });
}
