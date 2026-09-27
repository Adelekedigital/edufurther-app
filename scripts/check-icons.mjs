#!/usr/bin/env node
/**
 * pnpm check:icons (CI) — the committed icon font must be the one its list
 * describes (sha256), and the list must hold exactly the glyphs iconNames.ts
 * lists. A missing glyph renders as its ligature text ("arrow_forward"), so
 * adding an icon without `pnpm icons:pull` fails here.
 */
import { readFileSync } from 'node:fs';
import { fingerprint, iconNamesFromSource } from './fonts/icon-names.mjs';

const record = JSON.parse(readFileSync('src/app/fonts/material-symbols.json', 'utf8'));

// The list only speaks for the font it was written with: a swapped or re-fetched
// font without a regenerated list would render icons as their ligature text.
const actual = fingerprint(readFileSync('src/app/fonts/material-symbols.woff2'), record.names);
if (record.sha256 !== actual) {
  console.error(
    'check-icons: material-symbols.woff2 and material-symbols.json do not belong together ' +
      '(fingerprint mismatch). Run `pnpm icons:pull` and commit both files.',
  );
  process.exit(1);
}

const wanted = iconNamesFromSource(readFileSync('src/components/atoms/Icon/iconNames.ts', 'utf8'));
const have = record.names;
const missing = wanted.filter((n) => !have.includes(n));
const extra = have.filter((n) => !wanted.includes(n));
if (missing.length || extra.length) {
  console.error(
    `check-icons: the icon font is out of date (missing: ${missing.join(', ') || '—'}; ` +
      `unused: ${extra.join(', ') || '—'}). Run \`pnpm icons:pull\` and commit the result.`,
  );
  process.exit(1);
}
console.log(`check-icons: clean (${have.length} glyphs, font verified)`);
