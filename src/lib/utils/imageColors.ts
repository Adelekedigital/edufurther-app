import type { CoverKey } from './cover';

/**
 * Colours for server-drawn images (next/og's ImageResponse), which can't read
 * CSS variables or oklch(). The values below are the token declarations
 * verbatim (imageColors.test pins each one to src/styles/tokens), resolved and
 * converted to hex here, so an image never carries a colour of its own.
 */
const TOKENS = {
  'blue-50': '#e6f0ff',
  'blue-700': '#0047b5',
  'green-900': '#063f1a',
  'yellow-900': '#66440a',
  'ink-700': '#344054',
  'ink-900': '#101928',
  white: '#ffffff',
} as const;
export type ImageToken = keyof typeof TOKENS;

/** `--cover-{key}-ink`, as ours.css declares it. */
export const COVER_INK_DECL: Record<CoverKey, string> = {
  sky: 'var(--blue-700)',
  ice: 'oklch(0.42 0.09 230)',
  aqua: 'oklch(0.42 0.08 200)',
  mint: 'var(--green-900)',
  sage: 'oklch(0.4 0.08 135)',
  lemon: 'oklch(0.42 0.08 95)',
  sand: 'var(--yellow-900)',
  peach: 'oklch(0.45 0.11 50)',
  blush: 'oklch(0.45 0.13 25)',
  rose: 'oklch(0.44 0.13 355)',
  lilac: 'oklch(0.42 0.12 300)',
  mist: 'var(--ink-700)',
};

export const TOKEN_DECL: Readonly<Record<ImageToken, string>> = TOKENS;

/** A token's hex. */
export function tokenHex(name: ImageToken): string {
  return TOKENS[name];
}

/** The person's colour (`personCover`'s key) as hex: their initials' ground. */
export function coverInkHex(key: CoverKey): string {
  return resolve(COVER_INK_DECL[key]);
}

/** `var(--token)`, a hex, or `oklch(L C H)` → hex. */
export function resolve(value: string): string {
  const v = value.trim();
  const ref = /^var\(--([a-z0-9-]+)\)$/.exec(v);
  if (ref) {
    const name = ref[1] as ImageToken;
    if (!(name in TOKENS)) throw new Error(`imageColors: no token ${name}`);
    return TOKENS[name];
  }
  const ok = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(v);
  if (ok) return oklchToHex(Number(ok[1]), Number(ok[2]), Number(ok[3]));
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  throw new Error(`imageColors: can't resolve ${value}`);
}

/** CSS Color 4 oklch → sRGB, gamut-clipped. */
export function oklchToHex(l: number, c: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return (
    '#' +
    linear
      .map((x) => {
        const v = Math.min(1, Math.max(0, x));
        const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
        return Math.round(srgb * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}
