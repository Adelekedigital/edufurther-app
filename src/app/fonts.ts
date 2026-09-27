import localFont from 'next/font/local';

/**
 * Self-hosted fonts (product, 2026-09-27): the files live in ./fonts, so neither
 * builds nor visitors ever contact Google Fonts. Text fonts are subsets cut by
 * scripts/fonts/build_fonts.py from google/fonts (SIL OFL, licences alongside).
 * They request Latin incl. Yoruba/Igbo dot-below letters, West African letters
 * and ₦, but only where the source font has them: Inter (all UI text — names,
 * bios, buttons) covers every one; Hanken Grotesk (headings) lacks ₦, ṣ and the
 * West African letters; Nunito Sans (form fields) lacks ɛ ɔ ƙ; Poppins (DS spec
 * buttons, unused) lacks all. Missing characters fall back to a system font.
 * The build script prints each family's gaps.
 * The icon font is the Material Symbols subset from `pnpm icons:pull` (Apache 2.0).
 *
 * Each family becomes a --ff-* variable; styles/tokens/fonts.css maps the DS
 * role names (--font-brand, --font-ui, …) onto them. next/font/local still
 * preloads and sizes a metric-matched fallback, so text doesn't shift on swap.
 */
export const hanken = localFont({
  src: './fonts/hanken-grotesk-var.woff2',
  weight: '400 700',
  variable: '--ff-hanken',
  display: 'swap',
});

export const inter = localFont({
  src: './fonts/inter-var.woff2',
  weight: '400 700',
  variable: '--ff-inter',
  display: 'swap',
});

export const poppins = localFont({
  src: [
    { path: './fonts/poppins-600.woff2', weight: '600' },
    { path: './fonts/poppins-700.woff2', weight: '700' },
  ],
  variable: '--ff-poppins',
  display: 'swap',
  preload: false,
});

// Stands in for Avenir (DS substitution). Only form fields use it.
export const nunito = localFont({
  src: './fonts/nunito-sans-var.woff2',
  weight: '400 700',
  variable: '--ff-nunito',
  display: 'swap',
  preload: false,
});

// Icons: `block` so a glyph never flashes as its ligature text ("arrow_forward").
export const icons = localFont({
  src: './fonts/material-symbols.woff2',
  weight: '400',
  variable: '--ff-icons',
  display: 'block',
  adjustFontFallback: false,
});

export const fontVariables = [
  hanken.variable,
  inter.variable,
  poppins.variable,
  nunito.variable,
  icons.variable,
].join(' ');
