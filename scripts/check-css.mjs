#!/usr/bin/env node
/**
 * check-css.mjs — the design rules in stylelint.config.mjs, as a ratchet.
 *
 *   node scripts/check-css.mjs            fail if any file breaks a rule more often than its baseline
 *   node scripts/check-css.mjs --update   rewrite the baseline to today's counts (only ever downward)
 *
 * The codebase predates the rules, so the violations found on 2026-10-12 are
 * counted per file and rule in stylelint-baseline.json. A file may fix them
 * (and should lower its count with --update); it may never add one. A new file
 * starts at zero.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import stylelint from 'stylelint';

const BASELINE = 'stylelint-baseline.json';
const update = process.argv.includes('--update');

const { results } = await stylelint.lint({ files: 'src/**/*.css' });
const now = {};
for (const r of results) {
  const file = r.source.replace(/\\/g, '/').replace(/^.*?\/src\//, 'src/');
  for (const w of r.warnings) {
    if (r.invalidOptionWarnings?.length) throw new Error(`stylelint config: ${r.invalidOptionWarnings[0].text}`);
    const rule = w.rule;
    ((now[file] ??= {})[rule] ??= []).push(`${file}:${w.line}  ${w.text}`);
  }
}
const counts = Object.fromEntries(
  Object.entries(now)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([f, rules]) => [f, Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, v.length]))]),
);
const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};

if (update) {
  // Never raise a count: --update only records fixes.
  for (const [f, rules] of Object.entries(counts))
    for (const [k, n] of Object.entries(rules)) {
      const was = base[f]?.[k] ?? 0;
      if (existsSync(BASELINE) && n > was) {
        console.error(`check-css: ${f} ${k} is ${n}, above its baseline ${was}. Fix it; --update never raises a count.`);
        process.exit(1);
      }
    }
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
  const total = Object.values(counts).reduce((s, r) => s + Object.values(r).reduce((a, b) => a + b, 0), 0);
  console.log(`check-css: baseline written, ${total} existing violations in ${Object.keys(counts).length} files.`);
  process.exit(0);
}

const over = [];
let lower = 0;
for (const [f, rules] of Object.entries(counts))
  for (const [k, n] of Object.entries(rules)) {
    const was = base[f]?.[k] ?? 0;
    if (n > was) over.push(`${f}: ${k} ${n} (baseline ${was})\n    ${now[f][k].join('\n    ')}`);
    else if (n < was) lower++;
  }
for (const [f, rules] of Object.entries(base))
  for (const [k, was] of Object.entries(rules)) if (!(counts[f]?.[k] > 0) && was > 0) lower++;

if (over.length) {
  console.error(`check-css: new design-rule violations. Use the token instead:\n  ${over.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `check-css: clean against the baseline.` +
    (lower ? ` ${lower} count(s) went down: run \`node scripts/check-css.mjs --update\` to lock that in.` : ''),
);
