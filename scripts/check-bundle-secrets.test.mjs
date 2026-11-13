// node --test scripts/check-bundle-secrets.test.mjs (vitest only runs src/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { scanText, scanDirs } from './check-bundle-secrets.mjs';

// Fakes are built at run time, so no key-shaped string sits in the repo for a
// secret scanner to flag.
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const fakeJwt = (role) =>
  [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({
      iss: 'supabase',
      ref: 'abcdefghijklmnopqrst',
      role,
      iat: 1700000000,
      exp: 2000000000,
    }),
    randomBytes(32).toString('base64url'),
  ].join('.');
const fakeSecretKey = () => 'sb_' + 'secret_' + randomBytes(24).toString('base64url');

// Minified the way Next ships an inlined NEXT_PUBLIC_ value.
const inBundle = (value) => `let a="${value}";export const c=()=>a;`;

test('a planted new-format secret key is caught', () => {
  assert.deepEqual(scanText(inBundle(fakeSecretKey())), ['Supabase secret key']);
});

test('a planted service-role JWT is caught', () => {
  assert.deepEqual(scanText(inBundle(fakeJwt('service_role'))), ['Supabase service-role JWT']);
});

test('the public anon JWT and publishable key pass', () => {
  assert.deepEqual(scanText(inBundle(fakeJwt('anon'))), []);
  assert.deepEqual(
    scanText(inBundle('sb_' + 'publishable_' + randomBytes(24).toString('base64url'))),
    [],
  );
});

test('the SDK text that mentions the words passes', () => {
  const sdk = [
    'jn=e=>e.startsWith(`sb_publishable_`)||e.startsWith(`sb_secret_`)',
    "key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')",
    '* New-format Supabase API keys (`sb_publishable_…` / `sb_secret_…`) are not JWTs',
    'This method requires the service_role key. role:"service_role"',
  ].join('\n');
  assert.deepEqual(scanText(sdk), []);
});

test('the shipped Supabase SDK passes', () => {
  const require = createRequire(import.meta.url);
  const sdkRoot = dirname(require.resolve('@supabase/supabase-js/package.json'));
  const fromSdk = createRequire(join(sdkRoot, 'package.json'));
  const dists = ['auth-js', 'functions-js'].map((p) =>
    join(dirname(fromSdk.resolve(`@supabase/${p}/package.json`)), 'dist'),
  );
  const { files, findings } = scanDirs([join(sdkRoot, 'dist'), ...dists]);
  assert.ok(files > 0, 'scanned the SDK');
  assert.deepEqual(findings, []);
});

test('the existing patterns still fire', () => {
  assert.deepEqual(scanText('x="sk_' + 'live_abc"'), ['Stripe key']);
  assert.deepEqual(scanText('AKIA' + 'ABCDEFGHIJKLMNOP'), ['AWS access key']);
});

test('scanDirs names the file and skips binaries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'));
  try {
    mkdirSync(join(dir, 'chunks'));
    writeFileSync(join(dir, 'chunks', 'clean.js'), 'console.log("hi")');
    writeFileSync(join(dir, 'chunks', 'leak.js'), inBundle(fakeSecretKey()));
    writeFileSync(
      join(dir, 'font.woff2'),
      Buffer.concat([Buffer.from([0]), Buffer.from(fakeSecretKey())]),
    );
    const { files, findings } = scanDirs([dir]);
    assert.equal(files, 2);
    assert.deepEqual(findings, [
      { file: join(dir, 'chunks', 'leak.js'), kinds: ['Supabase secret key'] },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
