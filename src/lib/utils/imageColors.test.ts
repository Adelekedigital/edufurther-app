import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COVER_KEYS } from './cover';
import { COVER_INK_DECL, TOKEN_DECL, coverInkHex, oklchToHex, resolve } from './imageColors';

const css = ['colors.css', 'ours.css']
  .map((f) => readFileSync(join(process.cwd(), 'src/styles/tokens', f), 'utf8'))
  .join('\n');
const decl = (name: string) => new RegExp(`--${name}:\s*([^;]+);`).exec(css)?.[1]?.trim();

describe('imageColors', () => {
  it('mirrors the token files verbatim, so an image never drifts from the site', () => {
    for (const [name, value] of Object.entries(TOKEN_DECL)) expect(decl(name)).toBe(value);
    for (const key of COVER_KEYS) expect(decl(`cover-${key}-ink`)).toBe(COVER_INK_DECL[key]);
  });

  it('converts oklch to sRGB hex', () => {
    expect(oklchToHex(0.627955, 0.257627, 29.2339)).toBe('#ff0000');
    expect(oklchToHex(1, 0, 0)).toBe('#ffffff');
    expect(oklchToHex(0, 0, 0)).toBe('#000000');
  });

  it('resolves var() references and gives every cover a dark hex', () => {
    expect(resolve('var(--blue-700)')).toBe('#0047b5');
    for (const key of COVER_KEYS) expect(coverInkHex(key)).toMatch(/^#[0-9a-f]{6}$/);
    expect(() => resolve('var(--nope)')).toThrow();
  });
});
