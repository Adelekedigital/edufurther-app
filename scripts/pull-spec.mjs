#!/usr/bin/env node
/**
 * pnpm spec:pull — fetch the backend's published OpenAPI spec, lay the optional
 * ahead-of-backend overlay on top, and write openapi/openapi.json (untracked;
 * scripts/check-private-paths.mjs). Then `pnpm gen:api` generates the client.
 *
 *   OPENAPI_SPEC_URL           override the source (default: the backend's
 *                              rolling `openapi-latest` release asset)
 *   OPENAPI_SPEC_OVERLAY_JSON  overlay as JSON text (CI: an optional Actions secret)
 *   openapi/overlay.json       overlay file, used locally when the env var is unset
 *
 * The overlay holds only fields/endpoints the backend has not shipped yet.
 * Entries the backend already matches are reported so they can be deleted.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mergeOpenApi } from './lib/merge-openapi.mjs';

const DEFAULT_URL =
  'https://github.com/Adelekedigital/edufurtherbe/releases/download/openapi-latest/openapi.json';
const OUT = 'openapi/openapi.json';
const OVERLAY_FILE = 'openapi/overlay.json';
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

function parse(text, what) {
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(`${what} is not valid JSON (${err.message}).`);
  }
}

const base = parse(await download(), 'The downloaded spec');

let overlay = null;
let overlaySource = null;
if (process.env.OPENAPI_SPEC_OVERLAY_JSON?.trim()) {
  overlay = parse(process.env.OPENAPI_SPEC_OVERLAY_JSON, 'OPENAPI_SPEC_OVERLAY_JSON');
  overlaySource = 'OPENAPI_SPEC_OVERLAY_JSON';
} else if (existsSync(OVERLAY_FILE)) {
  overlay = parse(readFileSync(OVERLAY_FILE, 'utf8'), OVERLAY_FILE);
  overlaySource = OVERLAY_FILE;
}

let spec = base;
if (overlay) {
  try {
    const merged = mergeOpenApi(base, overlay);
    spec = merged.spec;
    const { added, replaced, redundant } = merged.report;
    console.log(`spec:pull: overlay from ${overlaySource}`);
    for (const w of added) console.log(`  + ${w}`);
    for (const w of replaced) console.log(`  ~ ${w}`);
    for (const w of redundant) {
      const msg = `overlay entry "${w}" now matches the backend spec; remove it from ${overlaySource}.`;
      console.log(inCi ? `::notice::${msg}` : `  = ${msg}`);
    }
  } catch (err) {
    fail(`overlay from ${overlaySource} could not be applied: ${err.message}`);
  }
} else {
  console.log('spec:pull: no overlay');
}

mkdirSync('openapi', { recursive: true });
writeFileSync(OUT, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`spec:pull: wrote ${OUT} (${Object.keys(spec.paths).length} paths) from ${url}`);
