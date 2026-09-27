#!/usr/bin/env node
/**
 * pnpm check:icons (CI) — the committed icon font must contain exactly the
 * glyphs iconNames.ts lists. A missing glyph renders as its ligature text
 * ("arrow_forward"), so adding an icon without `pnpm icons:pull` fails here.
 */
import { readFileSync } from 'node:fs';
import { iconNamesFromSource } from './fonts/icon-names.mjs';

const wanted = iconNamesFromSource(readFileSync('src/components/atoms/Icon/iconNames.ts', 'utf8'));
const have = JSON.parse(readFileSync('src/app/fonts/material-symbols.json', 'utf8')).names;
const missing = wanted.filter((n) => !have.includes(n));
const extra = have.filter((n) => !wanted.includes(n));
if (missing.length || extra.length) {
  console.error(
    `check-icons: the icon font is out of date (missing: ${missing.join(', ') || '—'}; ` +
      `unused: ${extra.join(', ') || '—'}). Run \`pnpm icons:pull\` and commit the result.`,
  );
  process.exit(1);
}
console.log(`check-icons: clean (${have.length} glyphs)`);
