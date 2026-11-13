import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { publicPhoto } from '@/lib/utils/publicPhoto';

/**
 * Server-only: what every link preview image (next/og) draws with. Shared by
 * the invite and mentor previews. Each route's folder must be in next.config's
 * `outputFileTracingIncludes`, or the files are missing on a deploy.
 */

export const OG_SIZE = { width: 1200, height: 630 };

/** The generic mentor preview, drawn once at build (app/og/mentor-fallback.png). */
export const MENTOR_FALLBACK_IMAGE = '/og/mentor-fallback.png';

/** A photo the crawler can't get in this time is drawn as the initials. */
const PHOTO_TIMEOUT_MS = 2500;

export const dataUrl = (bytes: Buffer, type: string) =>
  `data:${type};base64,${bytes.toString('base64')}`;

/** A bigger photo isn't drawn: a 224px circle needs nowhere near it. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** The body, or null once it passes `max` bytes (a missing or false content-length). */
async function readCapped(res: Response, max: number): Promise<Buffer | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      void reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * The photo as a data URL, or null: satori fails the whole image on a photo it
 * can't load, so it is fetched here first. Only our own public storage is
 * fetched (`publicPhoto`, checked again here), with no redirects, so the
 * server never fetches anywhere else; an image over PHOTO_MAX_BYTES is refused.
 */
export async function photoData(url: string | null): Promise<string | null> {
  const ours = publicPhoto(url);
  if (!ours) return null;
  try {
    const res = await fetch(ours, {
      redirect: 'error',
      signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/^image\/(png|jpeg|webp|gif)/.test(type)) return null;
    if (Number(res.headers.get('content-length') ?? 0) > PHOTO_MAX_BYTES) return null;
    const bytes = await readCapped(res, PHOTO_MAX_BYTES);
    return bytes ? dataUrl(bytes, type.split(';')[0]!) : null;
  } catch {
    return null;
  }
}

/**
 * DM Sans with Inter's gap file behind it (static cuts, scripts/fonts/og_fonts.py),
 * the logo (630×84) and the swoosh mark (128×55), as data URLs.
 */
export async function ogAssets() {
  const [regular, bold, gapsRegular, gapsBold, logo, mark] = await Promise.all([
    // Literal paths: a computed one makes the build trace the whole project.
    readFile(join(process.cwd(), 'src/app/fonts/og/dm-sans-regular.ttf')),
    readFile(join(process.cwd(), 'src/app/fonts/og/dm-sans-bold.ttf')),
    readFile(join(process.cwd(), 'src/app/fonts/og/inter-gaps-regular.ttf')),
    readFile(join(process.cwd(), 'src/app/fonts/og/inter-gaps-bold.ttf')),
    readFile(join(process.cwd(), 'public/brand/edufurther-logo-630.png')),
    readFile(join(process.cwd(), 'public/brand/edufurther-mark-swoosh.png')),
  ]);
  return {
    // Inter's gap file carries what DM Sans lacks (Ṣ, ọ, ₦…), per character,
    // as on the site: a name like "Ṣadé" never breaks the image.
    fontFamily: 'DM Sans, Inter Gaps',
    fonts: [
      { name: 'DM Sans', data: regular, weight: 400 as const, style: 'normal' as const },
      { name: 'DM Sans', data: bold, weight: 700 as const, style: 'normal' as const },
      { name: 'Inter Gaps', data: gapsRegular, weight: 400 as const, style: 'normal' as const },
      { name: 'Inter Gaps', data: gapsBold, weight: 700 as const, style: 'normal' as const },
    ],
    logo: dataUrl(logo, 'image/png'),
    mark: dataUrl(mark, 'image/png'),
  };
}
