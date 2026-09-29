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
