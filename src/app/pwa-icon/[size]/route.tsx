import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { BRAND_WHITE } from '@/styles/brand';

/**
 * The app icon (owner, 2026-11-07): the brand's swoosh "e" in brand blue,
 * centred on white, matching the white launch screen. The mark is cut from
 * the full-size wordmark (public/brand/edufurther-mark-swoosh-1024.png), so it
 * stays sharp at 512px. Its width keeps it inside the maskable safe zone (the
 * centre circle, 80% across), so launchers that crop to a circle or squircle
 * never clip it. Colours can't come from CSS variables in ImageResponse.
 */
/** Built once per deploy for each size (no render billed per request). */
export const dynamic = 'force-static';
export const dynamicParams = false;

/** The sizes served: 180 for iOS, 192 and 512 for the manifest. */
export const ICON_SIZES = [180, 192, 512] as const;

export function generateStaticParams() {
  return ICON_SIZES.map((s) => ({ size: String(s) }));
}

/** The mark's own size. */
const MARK = { width: 1024, height: 438 };
/** Share of the icon's width the mark takes: its corners stay inside the safe circle. */
export const MARK_SHARE = 0.62;

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = ICON_SIZES.find((s) => String(s) === size);
  if (!px) return new Response(null, { status: 404 });
  const png = await readFile(join(process.cwd(), 'public/brand/edufurther-mark-swoosh-1024.png'));
  const width = Math.round(px * MARK_SHARE);
  const height = Math.round((width * MARK.height) / MARK.width);
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
        width={width}
        height={height}
        alt=""
      />
    </div>,
    { width: px, height: px },
  );
}
