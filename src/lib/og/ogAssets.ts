import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Server-only: what every link preview image (next/og) draws with. Shared by
 * the invite and mentor previews. Each route's folder must be in next.config's
 * `outputFileTracingIncludes`, or the files are missing on a deploy.
 */

export const OG_SIZE = { width: 1200, height: 630 };

/** A photo the crawler can't get in this time is drawn as the initials. */
const PHOTO_TIMEOUT_MS = 2500;

export const dataUrl = (bytes: Buffer, type: string) =>
  `data:${type};base64,${bytes.toString('base64')}`;

/**
 * The photo as a data URL, or null: satori fails the whole image on a photo it
 * can't load, so it is fetched here first. Only our image host reaches here
 * (`inviterPhoto`).
 */
export async function photoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/^image\/(png|jpeg|webp|gif)/.test(type)) return null;
    return dataUrl(Buffer.from(await res.arrayBuffer()), type.split(';')[0]!);
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
