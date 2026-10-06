/**
 * The mock mentor's Google Calendar grant (ENABLE_MOCK_API=1).
 *
 * The defaults are **dev's real behaviour**, not a happy path: no grant, and
 * `/connect` answering 500 because no Google client is configured there
 * (backend reply #1). Override per run to drive the other states:
 *
 *   MOCK_CALENDAR=none|active|active-unnamed|error   (default none)
 *   MOCK_CALENDAR_CONNECT=unconfigured|ok  (default unconfigured)
 */

type Connection = {
  connected_at: string;
  status: 'active' | 'error';
  last_synced_at: string | null;
  last_error: string | null;
  /** Null is "not known" — a grant made before the consent asked for it. */
  account_email: string | null;
};

/** The two strings the backend can write, verbatim (reply #3). */
const REVOKED = 'the grant was revoked or has expired';

function seed(): Connection | null {
  const at = new Date(Date.now() - 86_400_000 * 3).toISOString();
  if (process.env.MOCK_CALENDAR === 'active')
    return {
      connected_at: at,
      status: 'active',
      last_synced_at: at,
      last_error: null,
      account_email: 'team@edufurther.com',
    };
  // A grant older than the widened consent: connected, but unnameable.
  if (process.env.MOCK_CALENDAR === 'active-unnamed')
    return {
      connected_at: at,
      status: 'active',
      last_synced_at: at,
      last_error: null,
      account_email: null,
    };
  if (process.env.MOCK_CALENDAR === 'error')
    return {
      connected_at: at,
      status: 'error',
      last_synced_at: at,
      last_error: REVOKED,
      account_email: 'team@edufurther.com',
    };
  return null;
}

let connection: Connection | null = seed();

export function readConnection(): Connection | null {
  return connection;
}

/** 204 when something was removed, 404 when there was nothing — as the API does. */
export function removeConnection(): number {
  if (!connection) return 404;
  connection = null;
  return 204;
}

export function connectConfigured(): boolean {
  return process.env.MOCK_CALENDAR_CONNECT === 'ok';
}

/**
 * Stands in for the consent round trip. The real flow leaves the app, so there
 * is nothing local to redirect to; the popup lands on a page that says so and
 * the grant is written here, which is what the page polls for.
 */
export function grantConnection(): void {
  const now = new Date().toISOString();
  connection = {
    connected_at: now,
    status: 'active',
    last_synced_at: null,
    last_error: null,
    account_email: 'team@edufurther.com',
  };
}
