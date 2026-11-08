// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ICON_SIZES, MARK_SHARE } from './[size]/route';

/** The mark's own proportions, read from the PNG header. */
const png = readFileSync(join(process.cwd(), 'public/brand/edufurther-mark-swoosh-1024.png'));
const mark = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };

describe('app icon', () => {
  it('serves the sizes iOS and the manifest ask for', () => {
    expect([...ICON_SIZES]).toEqual([180, 192, 512]);
  });

  it('the swoosh stays inside the maskable safe zone (a centred circle, 80% across)', () => {
    // Its corners are the farthest points from the centre.
    const w = MARK_SHARE;
    const h = (MARK_SHARE * mark.height) / mark.width;
    expect(Math.hypot(w / 2, h / 2)).toBeLessThanOrEqual(0.4);
  });

  it('is cut sharp enough for the largest icon (never upscaled)', () => {
    expect(mark.width).toBeGreaterThanOrEqual(Math.round(512 * MARK_SHARE));
  });
});
