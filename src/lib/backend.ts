/**
 * Server-only: where the backend is, and the header that proves a call came
 * through this app (backend #426, decision 304). Read by next.config.ts (build
 * check), src/proxy.ts (the /api/v1 rewrite) and the server-side calls in
 * lib/api/data (home.ts, sessionEnter.ts). Never import it from client code:
 * EDGE_PROXY_SECRET is not NEXT_PUBLIC_ and must never reach the browser.
 * Relative imports only: next.config.ts loads it outside the `@/` alias.
 */

/**
 * The origin lock's header. While the backend's EDGE_PROXY_SECRET is set, any
 * /api/ call without the matching value is refused with 403, so every call
 * this app makes to BACKEND_URL carries it. Lower case: what Headers stores.
 */
export const PROXY_SECRET_HEADER = 'x-edufurther-proxy-secret';

/** The backend refuses to start on anything else: 32+ visible ASCII characters, no spaces. */
const SECRET_SHAPE = /^[\x21-\x7e]{32,}$/;

/**
 * BACKEND_URL's origin, or null when it isn't set outside Vercel (local dev on
 * the mock). Throws when it is missing on Vercel, not a URL, or plain http to
 * anything but localhost, so a bad value fails the build, not the first call.
 */
export function backendOrigin(): string | null {
  const raw = process.env.BACKEND_URL?.trim();
  if (!raw) {
    if (process.env.VERCEL === '1') {
      throw new Error(
        'BACKEND_URL is not set for this Vercel environment (see README, Deploying).',
      );
    }
    return null;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`BACKEND_URL is not a URL: ${raw}`);
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('BACKEND_URL must be https (http only for localhost).');
  }
  return url.origin;
}

/**
 * EDGE_PROXY_SECRET, or null when unset (local dev; the backend is unlocked
 * unless its own copy is set). Throws on a value the backend would refuse,
 * without echoing it, so a typo fails the build instead of every call.
 */
export function proxySecret(): string | null {
  const raw = process.env.EDGE_PROXY_SECRET?.trim();
  if (!raw) return null;
  if (!SECRET_SHAPE.test(raw)) {
    throw new Error(
      'EDGE_PROXY_SECRET must be at least 32 visible ASCII characters with no spaces (openssl rand -hex 32).',
    );
  }
  return raw;
}

/** The header to add to a backend call: empty when no secret is set. */
export function proxySecretHeaders(): Record<string, string> {
  const secret = proxySecret();
  return secret ? { [PROXY_SECRET_HEADER]: secret } : {};
}
