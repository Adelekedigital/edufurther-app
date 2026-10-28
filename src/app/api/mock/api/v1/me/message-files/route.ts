import { NextResponse } from 'next/server';
import { mockUpload } from '@/lib/api/mock/messages';
import { pendingOk, problem } from '@/lib/api/mock/respond';

/** MOCK of POST /api/v1/me/message-files (multipart `file`; backend PR 2). ENABLE_MOCK_API=1 only. */
export async function POST(req: Request) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  await new Promise((r) => setTimeout(r, 500));
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return problem(422, { title: 'Validation failed' });
  const res = mockUpload(file.name, file.size, file.type);
  if (typeof res === 'string') return problem(422, { title: 'Refused', type: res });
  const { id, ...rest } = res;
  return pendingOk('POST /api/v1/me/message-files', { file_id: id, ...rest }, { status: 201 });
}
