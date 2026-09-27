#!/usr/bin/env node
/**
 * format-on-edit — PostToolUse hook for Edit/Write.
 *
 * Formats the file that was just written, using whatever the project already has.
 * Node, not a shell script: no bash requirement, no chmod, no PowerShell/bash
 * divergence. Node is a given in a React project.
 *
 * Never fails the tool call. A formatter that blocks an edit is worse than an
 * unformatted file, so every failure here is reported and swallowed.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, relative, resolve } from 'node:path';

const FORMATTABLE = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.css', '.scss', '.json', '.md', '.mdx', '.yml', '.yaml', '.html',
]);

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function ok(message) {
  if (message) process.stdout.write(`${message}\n`);
  process.exit(0);
}

const raw = readStdin();
if (!raw.trim()) ok();

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  ok();
}

const projectDir = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const filePath =
  payload.tool_input?.file_path ??
  payload.tool_input?.path ??
  payload.tool_response?.file_path;

if (!filePath) ok();

const abs = resolve(projectDir, filePath);

// Only touch files inside the project, and only ones a formatter understands.
const rel = relative(projectDir, abs);
if (rel.startsWith('..')) ok();
if (!FORMATTABLE.has(extname(abs))) ok();
if (!existsSync(abs)) ok();

/** Which package manager runner this project uses. */
function runner() {
  if (existsSync(join(projectDir, 'pnpm-lock.yaml'))) return ['pnpm', ['exec']];
  if (existsSync(join(projectDir, 'yarn.lock'))) return ['yarn', []];
  if (existsSync(join(projectDir, 'bun.lockb'))) return ['bun', ['x']];
  return ['npx', ['--no-install']];
}

function has(dep) {
  try {
    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
    return Boolean(pkg.dependencies?.[dep] ?? pkg.devDependencies?.[dep]);
  } catch {
    return false;
  }
}

const [cmd, prefix] = runner();
const isWindows = process.platform === 'win32';
const run = (args) =>
  spawnSync(cmd, [...prefix, ...args], {
    cwd: projectDir,
    encoding: 'utf8',
    shell: isWindows,        // .cmd shims on Windows are not directly executable
    timeout: 20_000,
  });

const done = [];

// Biome does both jobs in one pass, so prefer it when present.
if (has('@biomejs/biome')) {
  const r = run(['biome', 'check', '--write', rel]);
  if (r.status === 0) done.push('biome');
} else {
  if (has('prettier')) {
    const r = run(['prettier', '--write', rel]);
    if (r.status === 0) done.push('prettier');
  }
  if (has('eslint') && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(abs)) {
    const r = run(['eslint', '--fix', '--no-error-on-unmatched-pattern', rel]);
    // A non-zero exit here means unfixable lint errors remain. That is
    // information, not a reason to fail the edit.
    if (r.status === 0) done.push('eslint --fix');
  }
}

ok(done.length ? `formatted ${rel} (${done.join(', ')})` : '');
