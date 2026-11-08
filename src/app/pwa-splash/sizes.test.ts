import { APPLE_STARTUP_IMAGES, SPLASH_SIZES, splashKey } from './sizes';

describe('iPhone launch screens', () => {
  it('one image per size, each its exact pixel size, portrait', () => {
    const keys = SPLASH_SIZES.map(splashKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(splashKey({ width: 430, height: 932, scale: 3 })).toBe('1290x2796');
  });

  it('every image is matched to its device by size and pixel ratio', () => {
    for (const [i, s] of SPLASH_SIZES.entries()) {
      const img = APPLE_STARTUP_IMAGES[i]!;
      expect(img.url).toBe(`/pwa-splash/${splashKey(s)}`);
      expect(img.media).toContain(`(device-width: ${s.width}px)`);
      expect(img.media).toContain(`(device-height: ${s.height}px)`);
      expect(img.media).toContain(`(-webkit-device-pixel-ratio: ${s.scale})`);
      expect(img.media).toContain('(orientation: portrait)');
    }
  });
});
