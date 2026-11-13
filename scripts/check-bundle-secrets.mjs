#!/usr/bin/env node
/**
 * check-bundle-secrets.mjs — no secret ships in the client bundle.
 *
 *   node scripts/check-bundle-secrets.mjs            # scans .next/static, dist, build, out
 *   node scripts/check-bundle-secrets.mjs some/dir   # scans the given directories
 *
 * Anything behind NEXT_PUBLIC_ is in every browser, and removing the variable
 * later does not un-publish the old build, so a hit means rotate the key.
 *
 * Supabase keys need more than a grep (issue 173). The words `sb_secret_` and
 * `service_role` are both in the shipped SDK, so the checks match the shape of
 * a real key instead:
 *   - a new-format secret key: the `sb_secret_` prefix and a long key body;
 *   - a legacy service-role key: a JWT whose payload decodes to
 *     "role":"service_role". The role is base64 inside the key, so only
 *     decoding the middle segment can find it. The anon JWT is public and passes.
 *
 * Findings name the file and the kind of key, never the key itself: CI logs on
 * a public repo are public too.
 *
 * Exit codes: 0 clean, 1 a secret found, 2 nothing to scan.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Plain patterns: a match is a secret. */
export const PATTERNS = [
  { kind: 'Stripe key', re: /sk_live_|sk_test_/ },
  { kind: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { kind: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  // The SDK's own `sb_secret_` literals end at the quote or the ellipsis; a real
  // key carries a long body.
  { kind: 'Supabase secret key', re: /sb_secret_[A-Za-z0-9_-]{20,}/ },
];

// header.payload.signature, each base64url; a JSON object encodes as "ey…".
const JWT = /\bey[A-Za-z0-9_-]{10,}\.(ey[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]+/g;
const SERVICE_ROLE = /"role"\s*:\s*"service_role"/;

/** Whether one JWT payload segment decodes to the service role. */
export function isServiceRolePayload(segment) {
  try {
    return SERVICE_ROLE.test(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
}

/** The kinds of secret in a piece of text (empty when clean). */
export function scanText(text) {
  const found = [];
  for (const { kind, re } of PATTERNS) if (re.test(text)) found.push(kind);
  for (const m of text.matchAll(JWT)) {
    if (isServiceRolePayload(m[1])) {
      found.push('Supabase service-role JWT');
      break;
    }
  }
  return found;
}

// grep -I's rule: a NUL byte near the start means binary, not text.
const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

/** Scan every text file under `dirs`: { files, findings: [{ file, kinds }] }. */
export function scanDirs(dirs) {
  let files = 0;
  const findings = [];
  for (const dir of dirs) {
    for (const file of walk(dir)) {
      const buf = readFileSync(file);
      if (isBinary(buf)) continue;
      files += 1;
      const kinds = scanText(buf.toString('utf8'));
      if (kinds.length) findings.push({ file, kinds });
    }
  }
  return { files, findings };
}

const DEFAULT_DIRS = ['.next/static', 'dist', 'build', 'out'];

function main(argv) {
  const asked = argv.length ? argv : DEFAULT_DIRS;
  const dirs = asked.filter((d) => existsSync(d) && statSync(d).isDirectory());
  if (dirs.length === 0) {
    process.stderr.write(`check-bundle-secrets: no build output found in ${asked.join(', ')}\n`);
    return 2;
  }
  const { files, findings } = scanDirs(dirs);
  // A scan of zero files would report clean while checking nothing.
  if (files === 0) {
    process.stderr.write(`check-bundle-secrets: no text files under ${dirs.join(', ')}\n`);
    return 2;
  }
  if (findings.length) {
    for (const f of findings) {
      process.stdout.write(`${relative(process.cwd(), f.file)}: ${f.kinds.join(', ')}\n`);
    }
    process.stdout.write('A secret is present in the build output. Rotate it.\n');
    return 1;
  }
  process.stdout.write(`clean (${files} files in ${dirs.join(', ')})\n`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
