import { headers } from 'next/headers';
import createClient, { type Client } from 'openapi-fetch';
import type { paths } from '@/lib/api/generated/schema';
import { backendOrigin, proxySecretHeaders } from '@/lib/backend';
import { requestOrigin } from '@/lib/utils/requestOrigin';

/**
 * Server-only: the backend a server-side call goes to, or null when there is
 * none. Mock mode follows home.ts: NEXT_PUBLIC_MOCK_VIEWER set (local dev, CI)
 * means the in-app mock, on this app's own origin, which itself answers only
 * when ENABLE_MOCK_API=1. Otherwise the backend the proxy forwards to: the one
 * the origin-lock secret may go to. Shared by Session Join (sessionEnter.ts)
 * and the link previews (`serverRead`).
 */
export function serverBackend(origin: string): { base: string; mock: boolean } | null {
  if (process.env.NEXT_PUBLIC_MOCK_VIEWER) return { base: `${origin}/api/mock`, mock: true };
  const base = backendOrigin();
  return base ? { base, mock: false } : null;
}

/**
 * This app's origin for `serverBackend`, read from the request only in mock
 * mode, the one case that uses it: a route that reads no headers can stay
 * cached (the mentor link preview's revalidate).
 */
export async function mockOrigin(): Promise<string> {
  if (!process.env.NEXT_PUBLIC_MOCK_VIEWER) return '';
  return requestOrigin(await headers());
}

/** A chat app's crawler waits a few seconds at most: answer with the fallback first. */
export const PREVIEW_LOOKUP_TIMEOUT_MS = 3000;

/** What `serverRead` adds to every call: the origin-lock header and the timeout. */
export type ServerReadInit = { headers: Record<string, string>; signal: AbortSignal };

/**
 * Server-only: one public read for a link preview, with no token. The
 * origin-lock header (backend #426) goes with it, since this call skips the
 * proxy, except to the in-app mock. Null when there is no backend, no data or
 * any failure: the caller draws its fallback, never an error.
 */
export async function serverRead<T>(
  origin: string,
  read: (api: Client<paths>, init: ServerReadInit) => Promise<{ data?: T }>,
): Promise<T | null> {
  const target = serverBackend(origin);
  if (!target) return null;
  const api = createClient<paths>({ baseUrl: target.base });
  try {
    const { data } = await read(api, {
      headers: target.mock ? {} : proxySecretHeaders(),
      signal: AbortSignal.timeout(PREVIEW_LOOKUP_TIMEOUT_MS),
    });
    return data ?? null;
  } catch {
    return null;
  }
}
