import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND_WHITE } from '@/styles/brand';
import { SPLASH_SIZES, splashKey } from '../sizes';

/**
 * The iPhone launch screen: the wordmark centred on white, the manifest's
 * background colour. Built once at build time for every size (static), so it
 * costs no render per launch (owner's Vercel cost rules).
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return SPLASH_SIZES.map((s) => ({ size: splashKey(s) }));
}

/** The full-size wordmark (public/brand/edufurther-logo-full.png), never upscaled. */
const LOGO = { width: 4096, height: 547 };

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const match = SPLASH_SIZES.find((s) => splashKey(s) === size);
  if (!match) return new Response(null, { status: 404 });
  const width = match.width * match.scale;
  const height = match.height * match.scale;
  const png = await readFile(join(process.cwd(), 'public/brand/edufurther-logo-full.png'));
  // Half the screen's width, as the app draws it at the top of a page.
  const logoWidth = Math.round(width * 0.5);
  const logoHeight = Math.round((logoWidth * LOGO.height) / LOGO.width);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_WHITE,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain <img> only */}
      <img
        src={`data:image/png;base64,${png.toString('base64')}`}
        width={logoWidth}
        height={logoHeight}
        alt=""
      />
    </div>,
    { width, height },
  );
}
