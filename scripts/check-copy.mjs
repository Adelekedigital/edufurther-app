#!/usr/bin/env node
/**
 * check-copy.mjs — no em dash reaches a user.
 *
 *   node scripts/check-copy.mjs
 *
 * Hard rule 1 of the `edufurther-ux-writer` spec: no em dash (—) in any string
 * a user reads. Use a period, comma, colon or parentheses. An en dash (–) is
 * for number and time ranges (9:00–10:00 am, Mon–Fri) and a hyphen is for
 * compound words, so neither is touched here.
 *
 * WHY THIS IS NOT A GREP. Two reasons, both found the hard way while fixing
 * the 14 that were already shipped:
 *
 *  1. Most em dashes in this repo are in prose comments, and the ones that
 *     span lines leave continuation lines carrying no `*` or `//`. A
 *     line-based filter calls those violations.
 *  2. Copy is not only in quoted strings. `{filename} — no longer available`
 *     sits in JSX text between tags, and `That's fine — fewer questions…` the
 *     same. A regex looking inside quotes misses every one of them, which is
 *     exactly how the first pass at this list came back two short.
 *
 * So the file is walked once, tracking whether each character is in code, a
 * comment, a string or a template literal. Comments are the only place an em
 * dash is allowed; everywhere else is something a user can end up reading.
 *
 * SKIPPED, deliberately: tests, stories and the mock API routes. Those hold
 * fixture content standing in for what a *person typed* (a mentee's
 * cancellation reason, say), and real people type em dashes. The rule governs
 * the product's own voice, not quoted user input.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const EM_DASH = '—';

/** Fixture content: what a person typed, not the product's voice. */
const isFixture = (p) =>
  /\.test\.[jt]sx?$/.test(p) ||
  /\.stories\.[jt]sx?$/.test(p) ||
  p.split(sep).join('/').includes('/api/mock/');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.[jt]sx?$/.test(name) && !isFixture(full)) out.push(full);
  }
  return out;
}

/**
 * Every em dash that is not inside a comment, with its line number.
 * A single pass over the characters, because only the surrounding state tells
 * a comment apart from JSX text apart from a string.
 */
function offences(src) {
  const found = [];
  let line = 1;
  let state = 'code'; // code | line-comment | block-comment | ' | " | `
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '\n') line++;

    if (state === 'line-comment') {
      if (c === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (c === '*' && next === '/') {
        state = 'code';
        i++;
      }
      continue;
    }
    if (state === "'" || state === '"' || state === '`') {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === state) state = 'code';
      else if (c === EM_DASH) found.push(line);
      continue;
    }
    // code, which includes JSX text between tags
    if (c === '/' && next === '/') {
      state = 'line-comment';
      i++;
    } else if (c === '/' && next === '*') {
      state = 'block-comment';
      i++;
    } else if (c === "'" || c === '"' || c === '`') {
      state = c;
    } else if (c === EM_DASH) {
      found.push(line);
    }
  }
  return found;
}

const files = walk(SRC);
if (files.length === 0)
  throw new Error('check-copy: no source files found under src/. Run it from the repo root.');

const bad = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes(EM_DASH)) continue; // the common case, no walk needed
  const lines = src.split('\n');
  for (const n of offences(src)) {
    bad.push(
      `  ${relative(ROOT, file).split(sep).join('/')}:${n}  ${lines[n - 1].trim().slice(0, 96)}`,
    );
  }
}

if (bad.length) {
  process.stdout.write(
    `check-copy: ${bad.length} em dash(es) in copy a user reads.\n` +
      `${bad.join('\n')}\n\n` +
      'Hard rule 1 (edufurther-ux-writer): use a period, comma, colon or parentheses.\n' +
      'An en dash (–) is only for ranges; a hyphen only for compound words.\n',
  );
  process.exit(1);
}
process.stdout.write(`check-copy: clean (${files.length} files).\n`);
