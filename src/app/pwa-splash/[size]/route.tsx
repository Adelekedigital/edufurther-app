import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND_SLOGAN } from '@/lib/copy/brand';
import { tokenHex } from '@/lib/utils/imageColors';
import { BRAND_WHITE } from '@/styles/brand';
import { SLOGAN_TYPE, SPLASH_SIZES, splashKey, splashSloganShown } from '../sizes';

/**
 * The iPhone launch screen: the wordmark centred on white (the manifest's
 * background colour) and, when PWA_SPLASH_SLOGAN=true, the slogan under it
 * in secondary text at the design system's 12px paragraph size (owner,
 * 2026-11-08). DM Sans with Inter's gap file behind it, as the invite preview
 * draws text. Built once at build time for every size (static), so it costs
 * no render per launch (owner's Vercel cost rules).
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
  const [png, regular, gapsRegular] = await Promise.all([
    // Literal paths: a computed one makes the build trace the whole project.
    readFile(join(process.cwd(), 'public/brand/edufurther-logo-full.png')),
    readFile(join(process.cwd(), 'src/app/fonts/og/dm-sans-regular.ttf')),
    readFile(join(process.cwd(), 'src/app/fonts/og/inter-gaps-regular.ttf')),
  ]);
  // Half the screen's width, as the app draws it at the top of a page.
  const logoWidth = Math.round(width * 0.5);
  const logoHeight = Math.round((logoWidth * LOGO.height) / LOGO.width);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
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
      {splashSloganShown() && (
        <div
          style={{
            display: 'flex',
            marginTop: SLOGAN_TYPE.points * match.scale,
            // 240pt (at most 80% of the screen): two even lines on every iPhone,
            // never one word left alone.
            maxWidth: Math.min(SLOGAN_TYPE.maxWidthPoints * match.scale, Math.round(width * 0.8)),
            textAlign: 'center',
            justifyContent: 'center',
            fontFamily: 'DM Sans, Inter Gaps',
            fontSize: SLOGAN_TYPE.points * match.scale,
            lineHeight: SLOGAN_TYPE.lineHeight,
            color: tokenHex('ink-700'),
          }}
        >
          {BRAND_SLOGAN}
        </div>
      )}
    </div>,
    {
      width,
      height,
      fonts: [
        { name: 'DM Sans', data: regular, weight: 400, style: 'normal' },
        { name: 'Inter Gaps', data: gapsRegular, weight: 400, style: 'normal' },
      ],
    },
  );
}
