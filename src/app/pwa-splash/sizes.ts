/**
 * iPhone launch screens (`apple-touch-startup-image`). iOS shows one only
 * when its pixel size and media query match the device exactly; without a
 * match it shows black until the page paints. Portrait only: the installed
 * app opens upright. Points × scale = pixels.
 */
export type SplashSize = { width: number; height: number; scale: 2 | 3 };

export const SPLASH_SIZES: readonly SplashSize[] = [
  { width: 440, height: 956, scale: 3 }, // 16 Pro Max
  { width: 402, height: 874, scale: 3 }, // 16 Pro
  { width: 430, height: 932, scale: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { width: 393, height: 852, scale: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 428, height: 926, scale: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { width: 390, height: 844, scale: 3 }, // 12, 12 Pro, 13, 13 Pro, 14
  { width: 375, height: 812, scale: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { width: 414, height: 896, scale: 3 }, // XS Max, 11 Pro Max
  { width: 414, height: 896, scale: 2 }, // XR, 11
  { width: 414, height: 736, scale: 3 }, // 6 Plus to 8 Plus
  { width: 375, height: 667, scale: 2 }, // 6 to 8, SE 2nd and 3rd gen
  { width: 320, height: 568, scale: 2 }, // SE 1st gen
];

/** The route segment for a size: "1290x2796". */
export const splashKey = (s: SplashSize) => `${s.width * s.scale}x${s.height * s.scale}`;

export const APPLE_STARTUP_IMAGES = SPLASH_SIZES.map((s) => ({
  url: `/pwa-splash/${splashKey(s)}`,
  media: `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.scale}) and (orientation: portrait)`,
}));
