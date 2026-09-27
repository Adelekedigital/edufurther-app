#!/usr/bin/env node
/**
 * commit-guard — PreToolUse hook on Bash.
 *
 * Runs the boundary checker before a commit, so a leaked client import is caught
 * when it is one file rather than thirty. Also blocks a few things that should
 * never reach a commit.
 *
 * Turn this on LAST, once the rest of the standards are green. A guard that fires
 * on every commit from day one gets disabled within a week.
 *
 * Exit codes (Claude Code PreToolUse contract):
 *   0  allow
 *   2  block, and show stderr to the model
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

const raw = readStdin();
if (!raw.trim()) process.exit(0);

let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }

const command = payload.tool_input?.command ?? '';
const projectDir = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Only a commit. Not `git log`, not `git commit --help`, not a commit inside a
// string that happens to mention it.
if (!/(^|[\s;&|])git\s+(-\S+\s+)*commit\b/.test(command)) process.exit(0);
if (/--no-verify|--dry-run|--amend\s+--no-edit/.test(command)) process.exit(0);

const problems = [];

// ---- 1. staged app-source files -------------------------------------------

const staged = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
  cwd: projectDir, encoding: 'utf8',
});
const files = (staged.stdout ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

// App source only. A console.log in a script, a test, a story, or a config file is
// nobody's problem — this is why the guard does not fire on those.
const APP_SOURCE = /^(src\/)?(app|components|lib)\/.*\.(ts|tsx|js|jsx)$/;
const EXCLUDED = /\.(test|spec|stories)\.[tj]sx?$|\/__(tests|mocks)__\//;

const appFiles = files.filter((f) => APP_SOURCE.test(f) && !EXCLUDED.test(f));

// ---- 2. debug leftovers ----------------------------------------------------

const DEBUG_PATTERNS = [
  { re: /^\s*console\.(log|debug|dir)\s*\(/m, what: 'console.log' },
  { re: /^\s*debugger\s*;?\s*$/m, what: 'debugger' },
  { re: /\.only\s*\(/m, what: '.only( — a focused test would skip the suite' },
  { re: /\bFIXME\b/m, what: 'FIXME' },
];

for (const f of appFiles) {
  const abs = join(projectDir, f);
  if (!existsSync(abs)) continue;
  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { continue; }
  for (const { re, what } of DEBUG_PATTERNS) {
    const m = re.exec(src);
    if (m) {
      const line = src.slice(0, m.index).split('\n').length;
      problems.push(`${f}:${line}  ${what}`);
    }
  }
}

// ---- 3. obvious secrets ----------------------------------------------------

const SECRET_PATTERNS = [
  { re: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}/, what: 'a live/test secret key' },
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, what: 'a private key' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, what: 'an AWS access key id' },
  { re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, what: 'a GitHub token' },
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, what: 'a JWT' },
];

for (const f of files) {
  if (/\.(png|jpe?g|gif|webp|avif|woff2?|ico|pdf|zip)$/i.test(f)) continue;
  const abs = join(projectDir, f);
  if (!existsSync(abs)) continue;
  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { continue; }
  for (const { re, what } of SECRET_PATTERNS) {
    if (re.test(src)) problems.push(`${f}  looks like ${what}`);
  }
}

// A .env file should never be staged, whatever is in it.
for (const f of files) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !/\.env\.example$/.test(f)) {
    problems.push(`${f}  .env files are not committed (use .env.example)`);
  }
}

// ---- 4. the boundary checker ----------------------------------------------

let checkerOutput = '';
if (appFiles.length > 0 && existsSync(join(projectDir, 'scripts/check-boundaries.mjs'))) {
  const r = spawnSync(process.execPath, ['scripts/check-boundaries.mjs', '--quiet'], {
    cwd: projectDir, encoding: 'utf8', timeout: 60_000,
  });
  if (r.status === 1) {
    checkerOutput = (r.stdout ?? '').trim();
    problems.push('check-boundaries.mjs found violations');
  } else if (r.status === 2) {
    // Misconfigured is not the committer's fault. Warn, do not block.
    process.stderr.write(
      `commit-guard: check-boundaries is misconfigured, so it was skipped:\n${(r.stderr ?? '').trim()}\n`,
    );
  }
}

// ---- verdict ---------------------------------------------------------------

if (problems.length === 0) process.exit(0);

process.stderr.write(
  `commit-guard blocked this commit — ${problems.length} problem(s):\n\n` +
  problems.map((p) => `  ${p}`).join('\n') + '\n' +
  (checkerOutput ? `\n${checkerOutput}\n` : '') +
  '\nFix them, or commit with --no-verify if you have a reason and will say what it is.\n' +
  'The guard only inspects app source (app/, components/, lib/) — a console.log in a\n' +
  'test, a story, or a script does not fire it.\n',
);
process.exit(2);
