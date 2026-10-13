// Design rules for CSS (tech-debt audit item 3). Each rule bans a literal that
// a token already names, so a design update reaches every screen. Values with
// no token (a 36px control, a 1px hairline) are not flagged. What existed on
// 2026-10-12 is counted in stylelint-baseline.json, and that count may only
// shrink: scripts/check-css.mjs.

/** px values that equal a --space-* step (4–64, every 4). */
const SPACE_PX = '(?:4|8|12|16|20|24|28|32|36|40|44|48|52|56|60|64)px';

export default {
  ignoreFiles: ['src/styles/tokens/**', '**/node_modules/**', '.next/**', 'coverage/**'],
  rules: {
    // Colours come from tokens: a hex is a copy no design update reaches.
    'color-no-hex': true,
    'declaration-property-value-disallowed-list': {
      // Spacing that equals a --space-* step.
      '/^(padding|margin|gap|row-gap|column-gap|inset)(-.+)?$/': [`/(^|[\\s(,-])${SPACE_PX}(?![\\w-])/`],
      // Radii that equal a --radius-* step.
      '/^border(-.+)?-radius$/': ['/(^|[\\s(,])(?:4|5|6|8|10|16)px(?![\\w-])/'],
      // Control heights that equal --button-h-* or --touch-target-min.
      '/^(min-|max-)?(height|block-size)$/': ['/^(?:32|40|44|48)px$/'],
      // Type sizes only through the --text-* scale.
      'font-size': ['/\\d(?:px|rem|em)\\b/'],
      // Line heights from --lh-* (unitless) or inherited, never a px literal.
      'line-height': ['/\\dpx\\b/'],
    },
  },
};
