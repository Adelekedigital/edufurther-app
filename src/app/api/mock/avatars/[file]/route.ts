import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

/**
 * PHASE A MOCK: serves the synthetic test portraits in src/lib/api/mock/avatars
 * (StyleGAN faces, no real people — see manifest.json). ENABLE_MOCK_API=1 only,
 * so production never serves them. The name is matched exactly, so nothing
 * outside that folder can be read.
 */
const AVATAR_DIR = path.join(process.cwd(), 'src/lib/api/mock/avatars');
const NAME = /^face-\d{2}\.webp$/;

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { file } = await params;
  if (!NAME.test(file)) return new NextResponse(null, { status: 404 });
  try {
    const body = await readFile(path.join(AVATAR_DIR, file));
    return new NextResponse(new Uint8Array(body), {
      headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=86400' },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
