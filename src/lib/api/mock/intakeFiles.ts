/**
 * PHASE A MOCK STATE for intake uploads (POST /me/intake-files, backend #282),
 * served only when ENABLE_MOCK_API=1. The backend decides the type from the
 * bytes; the mock checks the magic numbers the same way (PDF `%PDF`, .docx a
 * zip `PK`) and the 5 MB cap.
 */
export const MAX_BYTES = 5 * 1024 * 1024;
export const uploads = new Map<string, { filename: string; size: number; used: boolean }>();

export function sniff(
  head: Uint8Array,
):
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | null {
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46)
    return 'application/pdf';
  if (head[0] === 0x50 && head[1] === 0x4b)
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return null;
}

/** A real, if tiny, one-page PDF, so a viewer's <object> has something to render. */
export const MOCK_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 160]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 78>>stream
BT /F1 14 Tf 24 100 Td (Statement of purpose - draft) Tj 0 -24 Td (Mock file) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>`;
