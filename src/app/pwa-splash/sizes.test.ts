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

describe('the launch-screen slogan (owner, 2026-11-08)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is hidden unless PWA_SPLASH_SLOGAN=true', async () => {
    const { splashSloganShown } = await import('./sizes');
    vi.stubEnv('PWA_SPLASH_SLOGAN', '');
    expect(splashSloganShown()).toBe(false);
    vi.stubEnv('PWA_SPLASH_SLOGAN', 'yes');
    expect(splashSloganShown()).toBe(false);
    vi.stubEnv('PWA_SPLASH_SLOGAN', 'true');
    expect(splashSloganShown()).toBe(true);
  });

  it('uses the design system’s smallest paragraph size and its line height', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { SLOGAN_TYPE } = await import('./sizes');
    const css = readFileSync(join(process.cwd(), 'src/styles/tokens/typography.css'), 'utf8');
    expect(css).toContain(`--text-p-xs: ${SLOGAN_TYPE.points}px;`);
    expect(css).toContain(`--lh-p: ${SLOGAN_TYPE.lineHeight};`);
  });
});
