#!/usr/bin/env node
/**
 * pnpm icons:pull — fetch the Material Symbols subset for exactly the glyphs in
 * src/components/atoms/Icon/iconNames.ts and commit it as a local font
 * (Apache 2.0). Run it whenever an icon is added; CI's `pnpm check:icons`
 * fails if iconNames.ts and the committed subset disagree.
 *
 * Writes src/app/fonts/material-symbols.woff2 + material-symbols.json (the
 * sorted names it contains). Runs locally only; builds never touch Google.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { iconNamesFromSource } from './icon-names.mjs';

const OUT = 'src/app/fonts/material-symbols';
const names = iconNamesFromSource(readFileSync('src/components/atoms/Icon/iconNames.ts', 'utf8'));

// Axes the Icon atom uses: optical size 20–24, weight 400, FILL 0–1, grade 0.
const css =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0..1,0' +
  `&icon_names=${names.join(',')}&display=block`;

// A current browser UA, or Google serves an older format than woff2.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const sheet = await fetch(css, { headers: { 'user-agent': UA } }).then((r) => {
  if (!r.ok) throw new Error(`Google Fonts CSS: HTTP ${r.status}`);
  return r.text();
});
// The subset URL is a `…/l/font?kit=…` query, marked format('woff2').
const url = sheet.match(/url\((https:[^)]+)\) format\('woff2'\)/)?.[1];
if (!url) throw new Error('No woff2 URL in the Google Fonts response.');
const font = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));

writeFileSync(`${OUT}.woff2`, font);
writeFileSync(`${OUT}.json`, `${JSON.stringify({ names }, null, 2)}\n`);
console.log(`icons:pull: ${names.length} glyphs, ${Math.round(font.length / 1024)} KB`);
