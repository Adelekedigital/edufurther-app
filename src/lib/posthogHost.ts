/**
 * Server-only: where `/ingest` goes (PRD 30, first-party path). The browser
 * only ever talks to this app; src/proxy.ts forwards `/ingest/…` to
 * POSTHOG_HOST and `/ingest/static/…` to its assets host, stripped of this
 * site's cookies. next.config.ts calls it so a bad value fails the build. The region is
 * decided later, so nothing here names one: POSTHOG_HOST is the ingestion
 * origin (e.g. `https://eu.i.posthog.com`), and POSTHOG_ASSETS_HOST the
 * assets origin, derived for PostHog Cloud's `<region>.i.posthog.com` when
 * unset. Unset POSTHOG_HOST: `/ingest` 404s and nothing loads.
 * Relative imports only: next.config.ts loads it outside the `@/` alias.
 */

function originOf(raw: string, name: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} is not a URL.`);
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(`${name} must be https (http only for localhost).`);
  }
  return url.origin;
}

export function posthogHosts(
  env: Record<string, string | undefined> = process.env,
): { api: string; assets: string } | null {
  const raw = env.POSTHOG_HOST?.trim();
  if (!raw) return null;
  const api = originOf(raw, 'POSTHOG_HOST');
  const assetsRaw = env.POSTHOG_ASSETS_HOST?.trim();
  if (assetsRaw) return { api, assets: originOf(assetsRaw, 'POSTHOG_ASSETS_HOST') };
  // PostHog Cloud: https://eu.i.posthog.com → https://eu-assets.i.posthog.com
  const cloud = /^https:\/\/([a-z0-9-]+)\.i\.posthog\.com$/.exec(api);
  return { api, assets: cloud ? `https://${cloud[1]}-assets.i.posthog.com` : api };
}
