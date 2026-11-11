#!/usr/bin/env node
/**
 * How big this branch looks to the GitHub code reviewer, counted exactly as it
 * counts (.github/workflows/code-reviewer.yml): the diff from the merge base,
 * with the same files left out, plus AGENTS.md. Over its MAX_DIFF_LINES the
 * reviewer skips the whole PR, so check BEFORE opening one: finding out after
 * CI and a review run costs a round trip (split, re-push, re-review).
 *
 *   node scripts/review-size.mjs [base] [head]     base: origin/development, head: HEAD
 *
 * Exit 1 when over the limit, 0 otherwise. The limit is read from the reviewer
 * workflow, so there is one number to change.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [base = 'origin/development', head = 'HEAD'] = process.argv.slice(2);

const workflow = readFileSync(
  new URL('../.github/workflows/code-reviewer.yml', import.meta.url),
  'utf8',
);
const limit = Number(/MAX_DIFF_LINES:\s*"?(\d+)"?/.exec(workflow)?.[1]);
if (!Number.isFinite(limit)) {
  console.error('review-size: MAX_DIFF_LINES not found in code-reviewer.yml');
  process.exit(2);
}

// The reviewer's exclusions, kept in the same order as code-reviewer.yml.
const EXCLUDE = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'docs/**',
  '*.md',
  '**/*.md',
  '.claude/**',
  '.github/**',
  'src/lib/api/generated/**',
  'openapi/**',
  'dist/**',
  'build/**',
  '.next/**',
  '**/__snapshots__/**',
  '**/*.snap',
  '**/*.woff2',
  '**/*.png',
  '**/*.jpg',
  '**/*.webp',
].map((p) => `:(exclude)${p}`);

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const from = git(['merge-base', base, head]).trim();
const lines = (text) => (text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0));
const total =
  lines(git(['diff', from, head, '--', '.', ...EXCLUDE])) +
  lines(git(['diff', from, head, '--', 'AGENTS.md']));

const over = total > limit;
console.log(
  `review-size: ${total} reviewed diff lines (limit ${limit})${over ? ': OVER, the reviewer will skip this PR. Split it.' : ''}`,
);
process.exit(over ? 1 : 0);
