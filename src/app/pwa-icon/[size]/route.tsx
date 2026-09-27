import { ImageResponse } from 'next/og';

/**
 * PLACEHOLDER app icon (blue square, white "e"), drawn in code because the
 * design's icons are themselves placeholders. Replace with brand PNGs in
 * /public and point app/manifest.ts at them.
 * Colours are the manifest's theme colour and white; ImageResponse cannot read CSS variables.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = size === '512' ? 512 : 192;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgb(0, 100, 255)',
        color: 'white',
        fontSize: px * 0.62,
        fontWeight: 700,
      }}
    >
      e
    </div>,
    { width: px, height: px },
  );
}
