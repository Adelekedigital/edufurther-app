import { NextResponse } from 'next/server';
import { MAX_BYTES, sniff, uploads } from '@/lib/api/mock/intakeFiles';

const problem = (status: number, title: string) =>
  NextResponse.json(
    { type: 'about:blank', title, status },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

/**
 * MOCK of POST /api/v1/me/intake-files (multipart, field `file`): 413 over
 * 5 MB, 422 not a PDF / .docx by its bytes, 409 at 10 unused uploads.
 * ENABLE_MOCK_API=1 only.
 */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return problem(422, 'Validation failed');
  await new Promise((r) => setTimeout(r, 900));
  if (file.size > MAX_BYTES) return problem(413, 'File too large');
  const type = sniff(new Uint8Array(await file.slice(0, 4).arrayBuffer()));
  if (!type) return problem(422, 'Only PDF or Word (.docx) files');
  if ([...uploads.values()].filter((u) => !u.used).length >= 10)
    return problem(409, 'Too many unused uploads');
  const id = crypto.randomUUID();
  const filename = file.name.replace(/^.*[\/]/, '');
  uploads.set(id, { filename, size: file.size, used: false });
  return NextResponse.json(
    { file_id: id, filename, size: file.size, content_type: type },
    { status: 201 },
  );
}
