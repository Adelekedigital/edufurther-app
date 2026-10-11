import localFont from 'next/font/local';

/**
 * Self-hosted fonts (product, 2026-09-27): the files live in ./fonts, so neither
 * builds nor visitors ever contact Google Fonts. Text fonts are subsets cut by
 * scripts/fonts/build_fonts.py from google/fonts (SIL OFL, licences alongside).
 *
 * One typeface, DM Sans, for every role (product, 2026-10-10: ADR 0002). DM
 * Sans has no ₦, Yoruba/Igbo dot-below letters (ẹ ọ ṣ ị ụ ṅ) or West African
 * letters (ɛ ɔ ɓ ɗ ƙ), so `interGaps` carries exactly those from Inter. Its
 * unicode-range (printed by the build script) means browsers fetch it only on a
 * page that shows one of them; Inter is close enough that a mixed word reads
 * as one, where a system-font fallback would not.
 * The icon font is the Material Symbols subset from `pnpm icons:pull` (Apache 2.0).
 *
 * Each family becomes a --ff-* variable; styles/tokens/fonts.css maps the DS
 * role names (--font-brand, --font-ui, …) onto them. next/font/local still
 * preloads and sizes a metric-matched fallback, so text doesn't shift on swap.
 */
export const dmSans = localFont({
  src: './fonts/dm-sans-var.woff2',
  weight: '400 700',
  variable: '--ff-dmsans',
  display: 'swap',
});

export const interGaps = localFont({
  src: './fonts/inter-gaps.woff2',
  weight: '400 700',
  variable: '--ff-inter-gaps',
  display: 'swap',
  // Only on demand: most pages never show these characters.
  preload: false,
  // First in the font stack (styles/tokens/fonts.css), so no metric-matched
  // fallback of its own: next/font's "… Fallback" face is Arial, which has
  // these characters, and would draw them before this file was ever reached.
  // The unicode-range keeps every other character on DM Sans.
  adjustFontFallback: false,
  // From `python scripts/fonts/build_fonts.py`; rebuild both together.
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0108-0109, U+011C-011D, U+0124-0125, U+0134-0135, U+0138, U+015C-015D, U+0166-0167, U+017F, U+0186, U+0189-018A, U+0190, U+0198-0199, U+01B3-01B4, U+0253-0254, U+0256-0257, U+025B, U+0263, U+0272, U+0309, U+030F, U+0313, U+0315, U+031B, U+0323, U+032C, U+0337-0338, U+0342-0343, U+0346-036F, U+1E44-1E45, U+1E62-1E63, U+1EB8-1EB9, U+1ECA-1ECD, U+1EE4-1EE5, U+2000-200B, U+2010-2012, U+2015-2017, U+201B, U+201F, U+2023-2025, U+2027, U+202F, U+2031-2038, U+203B-2043, U+2045-2055, U+2057, U+205F, U+20A0-20A7, U+20A9-20AB, U+20AD-20AF, U+20B1-20B5, U+20B8, U+20BC, U+20BE-20BF, U+FEFF',
    },
  ],
});

// Icons: `block` so a glyph never flashes as its ligature text ("arrow_forward").
export const icons = localFont({
  src: './fonts/material-symbols.woff2',
  weight: '400',
  variable: '--ff-icons',
  display: 'block',
  adjustFontFallback: false,
});

export const fontVariables = [dmSans.variable, interGaps.variable, icons.variable].join(' ');
