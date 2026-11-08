import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The service worker at /sw.js (ADR 0011), built once per deploy (static).
 * Its cache names carry the deploy's id, so each deploy starts clean caches
 * and drops the last one's. NEXT_PUBLIC_SERVICE_WORKER=off serves the
 * self-removing worker instead. Served no-cache (PWA_HEADERS), so every
 * device sees a new one on its next page load.
 */
export const dynamic = 'force-static';

/** The deploy's id on Vercel; a fixed value for local builds. */
export function buildId(): string {
  // `||`, not `??`: an empty variable counts as unset.
  const raw = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local';
  // Only what is safe inside a JS string and a cache name.
  return raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'local';
}

export function workerSource(): string {
  const dir = join(process.cwd(), 'src/lib/pwa');
  if (process.env.NEXT_PUBLIC_SERVICE_WORKER === 'off') {
    return readFileSync(join(dir, 'killWorker.js'), 'utf8');
  }
  return readFileSync(join(dir, 'worker.js'), 'utf8').replace("'__BUILD__'", `'${buildId()}'`);
}

export function GET() {
  return new Response(workerSource(), {
    headers: { 'content-type': 'application/javascript; charset=utf-8' },
  });
}
