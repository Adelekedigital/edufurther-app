#!/usr/bin/env node
/**
 * pnpm spec:pull — fetch the backend's published OpenAPI spec and write
 * openapi/openapi.json (untracked; scripts/check-private-paths.mjs). Then
 * `pnpm gen:api` generates the client.
 *
 *   OPENAPI_SPEC_URL  override the source (default: the backend's rolling
 *                     `openapi-latest` release asset, published on every merge
 *                     to its main branch)
 *
 * The client is typed from what the backend has shipped, nothing else. A call to
 * an endpoint that hasn't shipped yet stays inside the data-layer mock until it
 * does (project-conventions).
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const DEFAULT_URL =
  'https://github.com/Adelekedigital/edufurtherbe/releases/download/openapi-latest/openapi.json';
const OUT = 'openapi/openapi.json';
const inCi = !!process.env.GITHUB_ACTIONS;

const url = process.env.OPENAPI_SPEC_URL || DEFAULT_URL;

function fail(message) {
  console.error(inCi ? `::error::${message}` : `spec:pull: ${message}`);
  process.exit(1);
}

async function download(attempt = 1) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 2_000));
      return download(attempt + 1);
    }
    fail(
      `could not download the API spec from ${url} (${err.message}). ` +
        'The backend publishes it on every merge to its main branch (release "openapi-latest").',
    );
  }
}

let spec;
try {
  spec = JSON.parse(await download());
} catch (err) {
  fail(`the spec from ${url} is not valid JSON (${err.message}).`);
}
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
if (!isObject(spec) || typeof spec.openapi !== 'string' || !isObject(spec.paths)) {
  fail(`${url} did not return an OpenAPI spec (no "openapi" version or "paths").`);
}

mkdirSync('openapi', { recursive: true });
writeFileSync(OUT, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`spec:pull: wrote ${OUT} (${Object.keys(spec.paths).length} paths) from ${url}`);
