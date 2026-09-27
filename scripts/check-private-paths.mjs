#!/usr/bin/env node
/**
 * check-private-paths.mjs — this repo is public; some files must never be in it.
 *
 * Fails (exit 1) if git tracks anything under a private path, including files
 * force-added past .gitignore. Runs in CI on every PR and via `pnpm check:private`.
 *
 * Why these paths (product decision, 2026-09-27):
 *   openapi/                 the backend API spec — CI reads it from the
 *                            OPENAPI_SPEC_JSON Actions secret instead
 *   src/lib/api/generated/   generated from that spec; describes the same API
 *   docs/handoff/            FE <-> backend/design handoffs; backend internals
 */
import { execFileSync } from 'node:child_process';

const PRIVATE = ['openapi/', 'src/lib/api/generated/', 'docs/handoff/'];

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const leaks = tracked.filter((f) => PRIVATE.some((p) => f.replaceAll('\\', '/').startsWith(p)));

if (leaks.length) {
  console.error('check-private-paths: private files are tracked in this public repo:');
  for (const f of leaks) console.error(`  - ${f}`);
  console.error('\nUntrack them: git rm --cached <path>  (they are already in .gitignore)');
  process.exit(1);
}
console.log(`check-private-paths: clean (${tracked.length} tracked files checked)`);
