import { ImageResponse } from 'next/og';
import { MENTOR_SHARE_COPY } from '@/lib/copy/mentorShare';
import { OG_SIZE, ogAssets } from '@/lib/og/ogAssets';
import { OgFallback, OgFrame } from '@/lib/og/OgParts';

const COPY = MENTOR_SHARE_COPY.preview;

// Drawn once at build: every mentor link with no public profile redirects
// here, so unknown or hidden handles never draw an image of their own.
export const dynamic = 'force-static';

/** The generic mentor link preview (the mentor opengraph-image's fallback). */
export async function GET() {
  const assets = await ogAssets();
  return new ImageResponse(
    <OgFrame logo={assets.logo} fontFamily={assets.fontFamily}>
      <OgFallback mark={assets.mark} title={COPY.fallbackTitle} body={COPY.fallbackBody} />
    </OgFrame>,
    { ...OG_SIZE, fonts: assets.fonts },
  );
}
