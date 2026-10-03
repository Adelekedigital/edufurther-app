import { NextResponse } from 'next/server';

/**
 * MOCK of GET /api/v1/intake-files/{id}: the file's bytes. A real, if tiny,
 * one-page PDF, so the viewer's <object> has something to render rather than a
 * broken frame. ENABLE_MOCK_API=1 only.
 */
const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 160]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 78>>stream
BT /F1 14 Tf 24 100 Td (Statement of purpose - draft) Tj 0 -24 Td (Mock file) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>`;

export async function GET(_req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { fileId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 250));
  if (fileId === 'f-gone') return new NextResponse(null, { status: 404 });
  const word =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPdf = fileId !== 'f-cv';
  return new NextResponse(isPdf ? PDF : 'mock docx bytes', {
    headers: { 'content-type': isPdf ? 'application/pdf' : word },
  });
}
