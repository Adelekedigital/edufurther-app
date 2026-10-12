import type { MetadataRoute } from 'next';
import { BRAND_BLUE, BRAND_WHITE } from '@/styles/brand';

/** From the design's manifest.webmanifest. Starts on Explore. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EduFurther',
    short_name: 'EduFurther',
    start_url: '/explore',
    display: 'standalone',
    background_color: BRAND_WHITE,
    theme_color: BRAND_BLUE,
    icons: [
      // PLACEHOLDER icons (design says so too) — replace with the final brand icon.
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
